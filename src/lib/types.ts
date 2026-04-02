// ─── Shared type definitions ────────────────────────────────────────────────

// Calendar / Config
export interface GPCalendarEntry {
  number: number;
  name: string;
}

export interface AppConfig {
  year: number;
  users: string[];
  calendar: GPCalendarEntry[];
}

// Drivers & results
export type SessionKey = "SS" | "Sprint" | "Qualifying" | "Race";

export interface DriverResult {
  Position: number | null;
  Abbreviation: string;
  TeamName: string;
  TeamColour: string;
  DriverNumber: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /** Best lap time (quali/sprint quali array with Q1/Q2/Q3) or total race time (seconds) */
  duration: number | number[] | null;
  /** Gap to leader: seconds, "+N LAP(S)" string, or null */
  gap_to_leader: number | string | null;
  /** Number of laps completed */
  number_of_laps: number;
}

export interface RaceControlEvent {
  type: "SC" | "VSC" | "RF";
  lap: number | null;
}

export interface RaceControlCounts {
  SC: number;
  VSC: number;
  RF: number;
  events: RaceControlEvent[];
}

export interface GPData {
  event_name: string;
  event_format: string;
  results: Record<SessionKey, DriverResult[] | null>;
  race_control: Record<string, RaceControlCounts | null>;
}

// Predictions
export interface ExtraPrediction {
  type: "none" | "position" | "sc_vsc_rf" | "dnf";
  driver?: string;
  position?: number;
  event_type?: "SC" | "VSC" | "RF";
  count?: number;
}

export interface SavedSessionPrediction {
  picks: string[];
  extra: ExtraPrediction | null;
  /** ISO timestamp of last save — used for 15-min lock */
  saved_at?: string;
}

export type PredictionsMap = Record<string, Record<string, SavedSessionPrediction>>;

// Scoring
export interface SessionBreakdown {
  total: number;
  [reason: string]: number;
}

export interface UserResult {
  total: number;
  [session: string]: number | SessionBreakdown;
}

export type CalculateResponse = Record<string, UserResult>;

// Season standings
export interface SeasonStandingsData {
  totals: Record<string, number>;
  per_gp: Record<string, Record<string, number>>;
  calendar: Record<string, string>;
}

// OpenF1 raw types
export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  country_name: string;
  location: string;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
}

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  date_start: string;
  date_end: string;
}

export interface OpenF1Driver {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  first_name: string;
  last_name: string;
  team_name: string;
  team_colour: string;
  headshot_url: string | null;
  session_key: number;
}

export interface OpenF1SessionResult {
  driver_number: number;
  position: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  duration: number | number[] | null;
  gap_to_leader: number | string | number[] | null;
  number_of_laps: number;
  meeting_key: number;
  session_key: number;
}

export interface OpenF1RaceControl {
  category: string;
  date: string;
  driver_number: number | null;
  flag: string | null;
  lap_number: number | null;
  meeting_key: number;
  message: string;
  session_key: number;
}
