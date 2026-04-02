import type {
  DriverResult,
  ExtraPrediction,
  RaceControlCounts,
  SessionBreakdown,
  SessionKey,
  UserResult,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get sorted abbreviation list from DriverResult[] */
function getTopN(results: DriverResult[], n: number): string[] {
  return [...results]
    .sort((a, b) => {
      if (a.Position == null && b.Position == null) return 0;
      if (a.Position == null) return 1;
      if (b.Position == null) return -1;
      return a.Position - b.Position;
    })
    .slice(0, n)
    .map((r) => r.Abbreviation);
}

// ─── Race scoring ───────────────────────────────────────────────────────────

/**
 * CURSA: 10pts top5 exacte | 5pts top3 exacte | 1pt top3 sense ordre | 1pt top5 sense ordre
 */
function calculateRacePoints(userTop5: string[], results: DriverResult[]): SessionBreakdown {
  const userTop3 = userTop5.slice(0, 3);
  const actualTop3 = getTopN(results, 3);
  const actualTop5 = getTopN(results, 5);
  let points = 0;
  const breakdown: SessionBreakdown = { total: 0 };

  if (JSON.stringify(userTop5) === JSON.stringify(actualTop5)) {
    points += 10;
    breakdown.exact_top5 = 10;
  } else if (JSON.stringify(userTop3) === JSON.stringify(actualTop3)) {
    points += 5;
    breakdown.exact_top3 = 5;
  } else {
    const top3Hit = userTop3.filter((d) => actualTop3.includes(d)).length;
    if (top3Hit === 3) {
      points += 1;
      breakdown.top3_no_order = 1;
    }
    const top5Hit = userTop5.filter((d) => actualTop5.includes(d)).length;
    if (top5Hit === 5) {
      points += 1;
      breakdown.top5_no_order = 1;
    }
  }

  breakdown.total = points;
  return breakdown;
}

// ─── Qualifying / Sprint Qualifying scoring ─────────────────────────────────

/**
 * QUALI / SS: 3pts top3 exacte | 1pt top3 sense ordre
 */
function calculateQualiPoints(userTop3: string[], results: DriverResult[]): SessionBreakdown {
  const actualTop3 = getTopN(results, 3);
  let points = 0;
  const breakdown: SessionBreakdown = { total: 0 };

  if (JSON.stringify(userTop3) === JSON.stringify(actualTop3)) {
    points += 3;
    breakdown.exact_top3 = 3;
  } else {
    const top3Hit = userTop3.filter((d) => actualTop3.includes(d)).length;
    if (top3Hit === 3) {
      points += 1;
      breakdown.top3_no_order = 1;
    }
  }

  breakdown.total = points;
  return breakdown;
}

// ─── Sprint scoring ─────────────────────────────────────────────────────────

/**
 * SPRINT: 6pts top5 exacte | 3pts top3 exacte | 1pt top3 sense ordre | 1pt top5 sense ordre
 */
function calculateSprintPoints(userTop5: string[], results: DriverResult[]): SessionBreakdown {
  const userTop3 = userTop5.slice(0, 3);
  const actualTop3 = getTopN(results, 3);
  const actualTop5 = getTopN(results, 5);
  let points = 0;
  const breakdown: SessionBreakdown = { total: 0 };

  if (JSON.stringify(userTop5) === JSON.stringify(actualTop5)) {
    points += 6;
    breakdown.exact_top5 = 6;
  } else if (JSON.stringify(userTop3) === JSON.stringify(actualTop3)) {
    points += 3;
    breakdown.exact_top3 = 3;
  } else {
    const top3Hit = userTop3.filter((d) => actualTop3.includes(d)).length;
    if (top3Hit === 3) {
      points += 1;
      breakdown.top3_no_order = 1;
    }
    const top5Hit = userTop5.filter((d) => actualTop5.includes(d)).length;
    if (top5Hit === 5) {
      points += 1;
      breakdown.top5_no_order = 1;
    }
  }

  breakdown.total = points;
  return breakdown;
}

// ─── Extra point ────────────────────────────────────────────────────────────

function calculateExtraPoint(
  extra: ExtraPrediction | null | undefined,
  results: DriverResult[],
  raceControlCounts: RaceControlCounts | null,
): SessionBreakdown {
  const breakdown: SessionBreakdown = { total: 0 };
  if (!extra || extra.type === "none") return breakdown;

  const sorted = [...results].sort((a, b) => {
    if (a.Position == null && b.Position == null) return 0;
    if (a.Position == null) return 1;
    if (b.Position == null) return -1;
    return a.Position - b.Position;
  });

  if (extra.type === "position" && extra.driver && extra.position != null) {
    const driverResult = sorted.find((r) => r.Abbreviation === extra.driver);
    if (driverResult && driverResult.Position === extra.position) {
      breakdown.extra_position = 1;
      breakdown.total = 1;
    }
  }

  if (extra.type === "sc_vsc_rf" && extra.event_type && extra.count != null) {
    const actual = raceControlCounts?.[extra.event_type] ?? 0;
    if (actual === extra.count) {
      breakdown.extra_sc_vsc_rf = 1;
      breakdown.total = 1;
    }
  }

  if (extra.type === "dnf" && extra.driver) {
    const driverResult = sorted.find((r) => r.Abbreviation === extra.driver);
    if (driverResult?.dnf) {
      breakdown.extra_dnf = 1;
      breakdown.total = 1;
    }
  }

  return breakdown;
}

// ─── Weekend orchestrator ───────────────────────────────────────────────────

interface UserPredictions {
  [session: string]: {
    picks: string[];
    extra?: ExtraPrediction | null;
  };
}

interface WeekendData {
  results: Record<SessionKey, DriverResult[] | null>;
  race_control: Record<string, RaceControlCounts | null>;
}

/**
 * Calculate total weekend points for a single user.
 * Direct TypeScript port of the Python `calculate_weekend_points`.
 */
export function calculateWeekendPoints(
  userPredictions: UserPredictions,
  weekendData: WeekendData,
): UserResult {
  let totalPoints = 0;
  const result: UserResult = { total: 0 };
  const rc = weekendData.race_control;

  // Qualifying
  if (weekendData.results.Qualifying && userPredictions.Qualifying) {
    const q = calculateQualiPoints(
      userPredictions.Qualifying.picks.slice(0, 3),
      weekendData.results.Qualifying,
    );
    const extra = calculateExtraPoint(
      userPredictions.Qualifying.extra,
      weekendData.results.Qualifying,
      rc.Qualifying ?? null,
    );
    q.total += extra.total;
    Object.assign(q, Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "total")));
    result.Qualifying = q;
    totalPoints += q.total;
  }

  // Race
  if (weekendData.results.Race && userPredictions.Race) {
    const r = calculateRacePoints(
      userPredictions.Race.picks.slice(0, 5),
      weekendData.results.Race,
    );
    const extra = calculateExtraPoint(
      userPredictions.Race.extra,
      weekendData.results.Race,
      rc.Race ?? null,
    );
    r.total += extra.total;
    Object.assign(r, Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "total")));
    result.Race = r;
    totalPoints += r.total;
  }

  // Sprint
  if (weekendData.results.Sprint && userPredictions.Sprint) {
    const s = calculateSprintPoints(
      userPredictions.Sprint.picks.slice(0, 5),
      weekendData.results.Sprint,
    );
    const extra = calculateExtraPoint(
      userPredictions.Sprint.extra,
      weekendData.results.Sprint,
      rc.Sprint ?? null,
    );
    s.total += extra.total;
    Object.assign(s, Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "total")));
    result.Sprint = s;
    totalPoints += s.total;
  }

  // Sprint Qualifying (SS)
  if (weekendData.results.SS && userPredictions.SS) {
    const ss = calculateQualiPoints(
      userPredictions.SS.picks.slice(0, 3),
      weekendData.results.SS,
    );
    const extra = calculateExtraPoint(
      userPredictions.SS.extra,
      weekendData.results.SS,
      rc.SS ?? null,
    );
    ss.total += extra.total;
    Object.assign(ss, Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "total")));
    result.SS = ss;
    totalPoints += ss.total;
  }

  result.total = totalPoints;
  return result;
}
