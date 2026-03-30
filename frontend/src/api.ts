import axios from "axios";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GPCalendarEntry {
	number: number;
	name: string;
}

export interface AppConfig {
	year: number;
	users: string[];
	calendar: GPCalendarEntry[];
}

export interface DriverResult {
	Position: number;
	Abbreviation: string;
	TeamName?: string;
	Team?: string;
	Status?: string;
}

export type SessionKey = "SS" | "Sprint" | "Qualifying" | "Race";

export interface GPData {
	event_name: string;
	event_format: string;
	results: Record<SessionKey, DriverResult[] | null>;
	race_control: Record<string, unknown>;
}

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
}

export type PredictionsMap = Record<
	string,
	Record<string, SavedSessionPrediction>
>;

export interface SessionBreakdown {
	total: number;
	[reason: string]: number;
}

export interface UserResult {
	total: number;
	[session: string]: number | SessionBreakdown;
}

export type CalculateResponse = Record<string, UserResult>;

export interface SeasonStandingsData {
	totals: Record<string, number>;
	per_gp: Record<string, Record<string, number>>;
	calendar: Record<string, string>;
}

// ─── API client ─────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: BASE });

export const getConfig = (): Promise<AppConfig> =>
	api.get("/config").then((r) => r.data);

export const getGPData = (gpNumber: number): Promise<GPData> =>
	api.get(`/gp/${gpNumber}/data`).then((r) => r.data);

export const getPredictions = (gpNumber: number): Promise<PredictionsMap> =>
	api.get(`/gp/${gpNumber}/predictions`).then((r) => r.data);

export const savePrediction = (
	gpNumber: number,
	user: string,
	session: string,
	picks: string[],
	extra: ExtraPrediction
): Promise<{ status: string }> =>
	api
		.put(`/gp/${gpNumber}/predictions/${user}/${session}`, { picks, extra })
		.then((r) => r.data);

export const calculatePoints = (gpNumber: number): Promise<CalculateResponse> =>
	api.post(`/gp/${gpNumber}/calculate`).then((r) => r.data);

export const getSeasonStandings = (): Promise<SeasonStandingsData> =>
	api.get("/season/standings").then((r) => r.data);
