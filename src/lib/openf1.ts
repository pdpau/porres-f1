import { GP_CALENDAR } from "./config";
import type { GPConfig } from "./config";
import type {
  DriverResult,
  GPData,
  RaceControlCounts,
  SessionKey,
  OpenF1Meeting,
  OpenF1Session,
  OpenF1Driver,
  OpenF1SessionResult,
  OpenF1RaceControl,
} from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE = "https://api.openf1.org/v1";

const SESSION_NAME_MAP: Record<SessionKey, string[]> = {
  SS: ["Sprint Qualifying", "Sprint Shootout"],
  Sprint: ["Sprint"],
  Qualifying: ["Qualifying"],
  Race: ["Race"],
};

// Internal type — not exported; only used as position-endpoint fallback
interface OpenF1PositionEntry {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

// Pause between sequential API calls to respect OpenF1's 3 req/s limit (max 3 req/s)
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
const API_DELAY = 400;

// ─── Low-level fetchers ─────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenF1 ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMeetings(year: number): Promise<OpenF1Meeting[]> {
  return fetchJSON<OpenF1Meeting[]>(`${BASE}/meetings?year=${year}`);
}

export async function fetchSessions(meetingKey: number): Promise<OpenF1Session[]> {
  return fetchJSON<OpenF1Session[]>(`${BASE}/sessions?meeting_key=${meetingKey}`);
}

export async function fetchDrivers(sessionKey: number): Promise<OpenF1Driver[]> {
  return fetchJSON<OpenF1Driver[]>(`${BASE}/drivers?session_key=${sessionKey}`);
}

export async function fetchSessionResult(sessionKey: number): Promise<OpenF1SessionResult[]> {
  return fetchJSON<OpenF1SessionResult[]>(`${BASE}/session_result?session_key=${sessionKey}`);
}

export async function fetchRaceControl(sessionKey: number): Promise<OpenF1RaceControl[]> {
  return fetchJSON<OpenF1RaceControl[]>(`${BASE}/race_control?session_key=${sessionKey}`);
}

/**
 * Fetch position entries from the last 10 minutes of a session.
 * Used as a fallback when session_result has no data yet.
 * Keeping only the tail of the session keeps the payload small (~few hundred rows).
 */
async function fetchPositionsNearEnd(
  sessionKey: number,
  dateEnd: string,
): Promise<OpenF1PositionEntry[]> {
  const endMs = new Date(dateEnd).getTime();
  const cutoff = new Date(endMs - 10 * 60 * 1000).toISOString();
  return fetchJSON<OpenF1PositionEntry[]>(
    `${BASE}/position?session_key=${sessionKey}&date>=${cutoff}`,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const meetingsCache = new Map<number, OpenF1Meeting[]>();

function findMeeting(meetings: OpenF1Meeting[], gp: GPConfig): OpenF1Meeting | undefined {
  return meetings.find((m) =>
    gp.matchTerms.some(
      (term) =>
        m.meeting_name?.includes(term) ||
        m.country_name?.includes(term) ||
        m.location?.includes(term) ||
        m.circuit_short_name?.includes(term),
    ),
  );
}

function findSession(sessions: OpenF1Session[], key: SessionKey): OpenF1Session | undefined {
  const names = SESSION_NAME_MAP[key];
  return sessions.find((s) => names.includes(s.session_name));
}

function countRaceControlEvents(events: OpenF1RaceControl[]): RaceControlCounts {
  const counts: RaceControlCounts = { SC: 0, VSC: 0, RF: 0, events: [] };
  for (const ev of events) {
    const msg = (ev.message ?? "").toUpperCase();
    // VSC: "VSC DEPLOYED" — must check before SC to avoid false match
    if (msg.includes("VSC DEPLOYED")) {
      counts.VSC++;
      counts.events.push({ type: "VSC", lap: ev.lap_number });
    } else if (msg.includes("SAFETY CAR DEPLOYED")) {
      counts.SC++;
      counts.events.push({ type: "SC", lap: ev.lap_number });
    }
    // Match "RED FLAG" but NOT "CHEQUERED FLAG" (which contains "RED FLAG" as substring)
    if (/\bRED FLAG\b/.test(msg) && !msg.includes("CHEQUERED")) {
      counts.RF++;
      counts.events.push({ type: "RF", lap: ev.lap_number });
    }
  }
  return counts;
}

// ─── Main data loader ───────────────────────────────────────────────────────

/**
 * Load all race-weekend data for a given GP from the OpenF1 API.
 *
 * For each session it attempts two strategies in order:
 *   1. /session_result  — official classification; available a few minutes
 *      after the official F1 results are published.
 *   2. /position        — fallback using the last position entry per driver
 *      recorded in the final 10 minutes of the session.  This covers cases
 *      where session_result hasn't been populated yet by OpenF1.
 *
 * Race-control is fetched independently so a failure there never silences
 * session results (a bug present in the previous implementation).
 */
export async function loadGPData(year: number, gpNumber: number): Promise<GPData> {
  // 1. Resolve meeting
  let meetings = meetingsCache.get(year);
  if (!meetings) {
    meetings = await fetchMeetings(year);
    meetingsCache.set(year, meetings);
  }

  const gpConfig = GP_CALENDAR.find((g) => g.number === gpNumber);
  if (!gpConfig) throw new Error(`GP #${gpNumber} not found in calendar config`);

  const meeting = findMeeting(meetings, gpConfig);
  if (!meeting) throw new Error(`No OpenF1 meeting found for "${gpConfig.name}" in ${year}`);

  // 2. Fetch all sessions for this meeting
  const allSessions = await fetchSessions(meeting.meeting_key);
  const now = new Date();

  const sessionKeys: SessionKey[] = ["SS", "Sprint", "Qualifying", "Race"];
  const results: Record<SessionKey, DriverResult[] | null> = {
    SS: null,
    Sprint: null,
    Qualifying: null,
    Race: null,
  };
  const raceControl: Record<string, RaceControlCounts | null> = {};

  for (const key of sessionKeys) {
    const session = findSession(allSessions, key);

    // Session doesn't exist in this GP format (e.g. no Sprint)
    if (!session) {
      raceControl[key] = null;
      continue;
    }

    // Session hasn't ended yet — skip entirely
    if (new Date(session.date_end) > now) {
      raceControl[key] = null;
      continue;
    }

    // ── Fetch drivers (used by both strategies below) ──────────────
    const driverMap = new Map<number, OpenF1Driver>();
    try {
      await delay(API_DELAY);
      const drivers = await fetchDrivers(session.session_key);
      for (const d of drivers) driverMap.set(d.driver_number, d);
    } catch {
      // Proceed with empty map; abbreviations will fall back to "#N"
    }

    // ── Strategy 1: official session_result endpoint ───────────────
    let sessionResults: DriverResult[] | null = null;
    try {
      await delay(API_DELAY);
      const raw = await fetchSessionResult(session.session_key);
      if (raw.length > 0) {
        sessionResults = raw
          .sort((a, b) => {
            // DNF/DNS/DSQ drivers have null position — push them to the end
            if (a.position == null && b.position == null) return 0;
            if (a.position == null) return 1;
            if (b.position == null) return -1;
            return a.position - b.position;
          })
          .map((r) => {
            const driver = driverMap.get(r.driver_number);
            // gap_to_leader can be an array [Q1,Q2,Q3] for qualifying — take last non-null
            let gap = r.gap_to_leader;
            if (Array.isArray(gap)) {
              gap = null;
              for (let i = (r.gap_to_leader as unknown[]).length - 1; i >= 0; i--) {
                if ((r.gap_to_leader as (number | string | null)[])[i] != null) {
                  gap = (r.gap_to_leader as (number | string | null)[])[i]!;
                  break;
                }
              }
            }
            return {
              Position: r.position,
              Abbreviation: driver?.name_acronym ?? `#${r.driver_number}`,
              TeamName: driver?.team_name ?? "",
              TeamColour: driver?.team_colour ?? "FFFFFF",
              DriverNumber: r.driver_number,
              dnf: r.dnf,
              dns: r.dns,
              dsq: r.dsq,
              duration: r.duration,
              gap_to_leader: gap as number | string | null,
              number_of_laps: r.number_of_laps,
            };
          });
      }
    } catch {
      // Endpoint unavailable or error — fall through to strategy 2
    }

    // ── Strategy 2: derive positions from /position endpoint ────────
    // Used when session_result is empty (OpenF1 hasn't published it yet)
    if (!sessionResults) {
      try {
        await delay(API_DELAY);
        const posEntries = await fetchPositionsNearEnd(session.session_key, session.date_end);
        if (posEntries.length > 0) {
          const latestByDriver = new Map<number, OpenF1PositionEntry>();
          for (const p of posEntries) {
            const existing = latestByDriver.get(p.driver_number);
            if (!existing || p.date > existing.date) {
              latestByDriver.set(p.driver_number, p);
            }
          }
          const sorted = [...latestByDriver.values()]
            .filter((p) => p.position > 0)
            .sort((a, b) => a.position - b.position);

          if (sorted.length > 0) {
            sessionResults = sorted.map((p) => {
              const driver = driverMap.get(p.driver_number);
              return {
                Position: p.position,
                Abbreviation: driver?.name_acronym ?? `#${p.driver_number}`,
                TeamName: driver?.team_name ?? "",
                TeamColour: driver?.team_colour ?? "FFFFFF",
                DriverNumber: p.driver_number,
                dnf: false,
                dns: false,
                dsq: false,
                duration: null,
                gap_to_leader: null,
                number_of_laps: 0,
              };
            });
          }
        }
      } catch {
        // Both strategies failed; leave sessionResults as null
      }
    }

    results[key] = sessionResults;

    // ── Race control — fetched independently so failures don't ──────
    // overwrite already-populated session results (was a bug before)
    try {
      await delay(API_DELAY);
      const rcEvents = await fetchRaceControl(session.session_key);
      raceControl[key] = countRaceControlEvents(rcEvents);
    } catch {
      raceControl[key] = { SC: 0, VSC: 0, RF: 0, events: [] };
    }
  }

  const hasSprintWeekend = allSessions.some(
    (s) =>
      SESSION_NAME_MAP.Sprint.includes(s.session_name) ||
      SESSION_NAME_MAP.SS.includes(s.session_name),
  );

  return {
    event_name: meeting.meeting_name,
    event_format: hasSprintWeekend ? "sprint_qualifying" : "conventional",
    results,
    race_control: raceControl,
  };
}
