import { supabase } from "./lib/supabase";
import { loadGPData } from "./lib/openf1";
import { calculateWeekendPoints } from "./lib/scoring";
import { YEAR, USER_NAMES, GP_CALENDAR } from "./lib/config";

// Re-export types from the shared types module
export type {
	GPCalendarEntry,
	AppConfig,
	DriverResult,
	SessionKey,
	RaceControlCounts,
	RaceControlEvent,
	GPData,
	ExtraPrediction,
	SavedSessionPrediction,
	PredictionsMap,
	SessionBreakdown,
	UserResult,
	CalculateResponse,
	SeasonStandingsData,
} from "./lib/types";

import type {
	GPData,
	ExtraPrediction,
	PredictionsMap,
	CalculateResponse,
	SeasonStandingsData,
} from "./lib/types";

// ─── GP Data (straight from OpenF1, no DB cache) ───────────────────────────

export const getGPData = async (gpNumber: number): Promise<GPData> => {
	return loadGPData(YEAR, gpNumber);
};

// ─── Predictions (Supabase) ─────────────────────────────────────────────────

export const getPredictions = async (gpNumber: number): Promise<PredictionsMap> => {
	const { data: rows, error } = await supabase
		.from("predictions")
		.select("*")
		.eq("year", YEAR)
		.eq("gp_number", gpNumber);

	if (error) throw new Error(error.message);

	const result: PredictionsMap = {};
	for (const row of rows ?? []) {
		if (!result[row.user]) result[row.user] = {};
		result[row.user][row.session] = {
			picks: row.picks,
			extra: row.extra,
			saved_at: row.created_at,
		};
	}
	return result;
};

export const savePrediction = async (
	gpNumber: number,
	user: string,
	session: string,
	picks: string[],
	extra: ExtraPrediction
): Promise<{ status: string }> => {
	const { error } = await supabase.from("predictions").upsert(
		{
			year: YEAR,
			gp_number: gpNumber,
			user,
			session,
			picks,
			extra,
		},
		{ onConflict: "year,gp_number,user,session" }
	);

	if (error) throw new Error(error.message);
	return { status: "ok" };
};

// ─── Calculate points (local scoring → save to Supabase) ───────────────────

export const calculatePoints = async (
	gpNumber: number,
	preloadedGpData?: GPData,
): Promise<CalculateResponse> => {
	// Use pre-loaded data if available (avoids a second OpenF1 round-trip)
	const gpData = preloadedGpData ?? (await getGPData(gpNumber));

	// 2. Load all predictions
	const predictions = await getPredictions(gpNumber);

	// 3. Calculate points for each user
	const allResults: CalculateResponse = {};

	for (const user of USER_NAMES) {
		const userPreds = predictions[user] ?? {};

		const adapted: Record<string, { picks: string[]; extra?: ExtraPrediction | null }> = {};
		for (const [session, sdata] of Object.entries(userPreds)) {
			adapted[session] = {
				picks: sdata.picks,
				extra: sdata.extra,
			};
		}

		allResults[user] = calculateWeekendPoints(adapted, {
			results: gpData.results,
			race_control: gpData.race_control,
		});
	}

	// 4. Save scores to Supabase
	const upserts = Object.entries(allResults).map(([user, res]) => {
		const breakdown: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(res)) {
			if (k !== "total") breakdown[k] = v;
		}
		return {
			year: YEAR,
			gp_number: gpNumber,
			user,
			points_breakdown: breakdown,
			total_points: res.total,
		};
	});

	await supabase
		.from("season_scores")
		.upsert(upserts, { onConflict: "year,gp_number,user" });

	return allResults;
};

// ─── Season standings (Supabase) ────────────────────────────────────────────

/** Check if scores have been calculated for a specific GP */
export const getGPScores = async (gpNumber: number): Promise<CalculateResponse | null> => {
	const { data: rows, error } = await supabase
		.from("season_scores")
		.select("*")
		.eq("year", YEAR)
		.eq("gp_number", gpNumber);

	if (error) throw new Error(error.message);
	if (!rows || rows.length === 0) return null;

	const result: CalculateResponse = {};
	for (const row of rows) {
		const breakdown = (row.points_breakdown ?? {}) as Record<string, unknown>;
		result[row.user] = {
			total: row.total_points,
			...breakdown,
		} as CalculateResponse[string];
	}
	return result;
};

export const getSeasonStandings = async (): Promise<SeasonStandingsData> => {
	const { data: rows, error } = await supabase
		.from("season_scores")
		.select("*")
		.eq("year", YEAR);

	if (error) throw new Error(error.message);

	const totals: Record<string, number> = {};
	for (const u of USER_NAMES) totals[u] = 0;

	const perGP: Record<string, Record<string, number>> = {};

	for (const row of rows ?? []) {
		totals[row.user] = (totals[row.user] ?? 0) + row.total_points;
		if (!perGP[row.gp_number]) perGP[row.gp_number] = {};
		perGP[row.gp_number][row.user] = row.total_points;
	}

	const calendar: Record<string, string> = {};
	for (const gp of GP_CALENDAR) {
		calendar[gp.number] = gp.name;
	}

	return { totals, per_gp: perGP, calendar };
};
