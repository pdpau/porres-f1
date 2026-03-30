import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getGPData,
	getPredictions,
	savePrediction,
	calculatePoints
} from "../api";
import type {
	ExtraPrediction,
	GPData,
	PredictionsMap,
	CalculateResponse,
	SessionKey
} from "../api";
import ResultsTable from "./ResultsTable";

// ─── Constants ──────────────────────────────────────────────────────────────

const SESSION_ORDER: SessionKey[] = ["SS", "Sprint", "Qualifying", "Race"];

const SESSION_LABELS: Record<SessionKey, string> = {
	SS: "Sprint Qualifying",
	Sprint: "Sprint",
	Qualifying: "Qualifying",
	Race: "Race"
};

const TOP_N: Record<SessionKey, number> = {
	Race: 5,
	Sprint: 5,
	Qualifying: 3,
	SS: 3
};

const EXTRA_OPTIONS = ["Cap", "Posició exacta", "SC/VSC/RF", "DNF"] as const;

// ─── Sub-components ─────────────────────────────────────────────────────────

interface DriverSelectProps {
	drivers: string[];
	value: string;
	onChange: (v: string) => void;
	label: string;
}

function DriverSelect({ drivers, value, onChange, label }: DriverSelectProps) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-xs text-zinc-500">{label}</label>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 transition-colors">
				{drivers.map((d) => (
					<option key={d} value={d}>
						{d}
					</option>
				))}
			</select>
		</div>
	);
}

// ─── ExtraPoint ─────────────────────────────────────────────────────────────

interface ExtraPointProps {
	session: string;
	drivers: string[];
	extra: ExtraPrediction;
	onChange: (e: ExtraPrediction) => void;
}

function ExtraPoint({ drivers, extra, onChange }: ExtraPointProps) {
	const typeLabel =
		extra?.type === "position"
			? "Posició exacta"
			: extra?.type === "sc_vsc_rf"
				? "SC/VSC/RF"
				: extra?.type === "dnf"
					? "DNF"
					: "Cap";

	const setType = (label: string) => {
		if (label === "Cap") onChange({ type: "none" });
		else if (label === "Posició exacta")
			onChange({
				type: "position",
				driver: drivers[5] || drivers[0],
				position: 6
			});
		else if (label === "SC/VSC/RF")
			onChange({ type: "sc_vsc_rf", event_type: "SC", count: 0 });
		else if (label === "DNF") onChange({ type: "dnf", driver: drivers[0] });
	};

	return (
		<div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<span className="text-xs text-zinc-500">🎲 Punt extra</span>
				<select
					value={typeLabel}
					onChange={(e) => setType(e.target.value)}
					className="ml-auto bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-red-500">
					{EXTRA_OPTIONS.map((o) => (
						<option key={o}>{o}</option>
					))}
				</select>
			</div>

			{extra?.type === "position" && (
				<div className="flex gap-2">
					<DriverSelect
						label="Pilot"
						drivers={drivers}
						value={extra.driver ?? drivers[0]}
						onChange={(v) => onChange({ ...extra, driver: v })}
					/>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-zinc-500">Posició</label>
						<input
							type="number"
							min={6}
							max={20}
							value={extra.position ?? 6}
							onChange={(e) =>
								onChange({ ...extra, position: parseInt(e.target.value) })
							}
							className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
						/>
					</div>
				</div>
			)}

			{extra?.type === "sc_vsc_rf" && (
				<div className="flex gap-2">
					<div className="flex flex-col gap-1">
						<label className="text-xs text-zinc-500">Tipus</label>
						<select
							value={extra.event_type ?? "SC"}
							onChange={(e) =>
								onChange({
									...extra,
									event_type: e.target.value as "SC" | "VSC" | "RF"
								})
							}
							className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-red-500">
							{(["SC", "VSC", "RF"] as const).map((t) => (
								<option key={t}>{t}</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-zinc-500">Quantitat</label>
						<input
							type="number"
							min={0}
							max={10}
							value={extra.count ?? 0}
							onChange={(e) =>
								onChange({ ...extra, count: parseInt(e.target.value) })
							}
							className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-red-500"
						/>
					</div>
				</div>
			)}

			{extra?.type === "dnf" && (
				<DriverSelect
					label="Pilot DNF"
					drivers={drivers}
					value={extra.driver ?? drivers[0]}
					onChange={(v) => onChange({ ...extra, driver: v })}
				/>
			)}
		</div>
	);
}

// ─── UserCard ───────────────────────────────────────────────────────────────

interface UserCardProps {
	user: string;
	sessions: SessionKey[];
	drivers: string[];
	savedPredictions: PredictionsMap | undefined;
	gpNumber: number;
}

function UserCard({
	user,
	sessions,
	drivers,
	savedPredictions,
	gpNumber
}: UserCardProps) {
	const qc = useQueryClient();

	const defaultPicks = (session: SessionKey): string[] => {
		const saved = savedPredictions?.[user]?.[session];
		if (saved?.picks) return saved.picks;
		return drivers.slice(0, TOP_N[session]);
	};

	const defaultExtra = (session: SessionKey): ExtraPrediction => {
		return (
			(savedPredictions?.[user]?.[session]?.extra as ExtraPrediction) || {
				type: "none"
			}
		);
	};

	const [picks, setPicks] = useState<Record<string, string[]>>(() =>
		Object.fromEntries(sessions.map((s) => [s, defaultPicks(s)]))
	);
	const [extras, setExtras] = useState<Record<string, ExtraPrediction>>(() =>
		Object.fromEntries(sessions.map((s) => [s, defaultExtra(s)]))
	);

	const saveMutation = useMutation({
		mutationFn: ({ session }: { session: string }) =>
			savePrediction(gpNumber, user, session, picks[session], extras[session]),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["predictions", gpNumber] })
	});

	const updatePick = (session: string, idx: number, driver: string) => {
		setPicks((prev) => {
			const next = [...prev[session]];
			next[idx] = driver;
			return { ...prev, [session]: next };
		});
	};

	const updateExtra = (session: string, extra: ExtraPrediction) =>
		setExtras((prev) => ({ ...prev, [session]: extra }));

	const isSaved = (session: string): boolean => {
		const sp = savedPredictions?.[user]?.[session];
		if (!sp) return false;
		return JSON.stringify(sp.picks) === JSON.stringify(picks[session]);
	};

	return (
		<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5">
			<h2 className="text-lg font-semibold border-b border-zinc-800 pb-3">
				{user}
			</h2>

			{sessions.map((session) => (
				<div key={session} className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-zinc-300">
							{SESSION_LABELS[session]}
						</span>
						<button
							onClick={() => saveMutation.mutate({ session })}
							className={`text-xs px-3 py-1 rounded-lg transition-colors ${
								isSaved(session)
									? "bg-green-900 text-green-400 cursor-default"
									: "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
							}`}>
							{saveMutation.isPending
								? "…"
								: isSaved(session)
									? "✓ Desat"
									: "Desar"}
						</button>
					</div>

					<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
						{Array.from({ length: TOP_N[session] }).map((_, i) => (
							<DriverSelect
								key={i}
								label={`P${i + 1}`}
								drivers={drivers}
								value={picks[session]?.[i] || drivers[i] || ""}
								onChange={(v) => updatePick(session, i, v)}
							/>
						))}
					</div>

					<ExtraPoint
						session={session}
						drivers={drivers}
						extra={extras[session]}
						onChange={(e) => updateExtra(session, e)}
					/>
				</div>
			))}
		</div>
	);
}

// ─── PredictionForm (main export) ───────────────────────────────────────────

interface PredictionFormProps {
	gpNumber: number;
	users: string[];
}

export default function PredictionForm({
	gpNumber,
	users
}: PredictionFormProps) {
	const [results, setResults] = useState<CalculateResponse | null>(null);

	const {
		data: gpData,
		isLoading: loadingGP,
		refetch: fetchGP
	} = useQuery<GPData>({
		queryKey: ["gpData", gpNumber],
		queryFn: () => getGPData(gpNumber),
		enabled: false,
		retry: false
	});

	const { data: savedPredictions } = useQuery<PredictionsMap>({
		queryKey: ["predictions", gpNumber],
		queryFn: () => getPredictions(gpNumber),
		enabled: !!gpData
	});

	const calcMutation = useMutation({
		mutationFn: () => calculatePoints(gpNumber),
		onSuccess: (data) => setResults(data)
	});

	const sessions: SessionKey[] = gpData
		? SESSION_ORDER.filter((s) => gpData.results?.[s])
		: [];

	const drivers: string[] = sessions.length
		? [
				...new Set(
					(gpData!.results[sessions[0]] || [])
						.map((r) => r.Abbreviation)
						.filter(Boolean)
				)
			].sort()
		: [];

	return (
		<div className="mt-6 flex flex-col gap-6">
			{/* Load GP button */}
			<div className="flex items-center gap-4">
				<button
					onClick={() => {
						setResults(null);
						fetchGP();
					}}
					disabled={loadingGP}
					className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
					{loadingGP ? "⏳ Carregant…" : "📡 Carregar dades del GP"}
				</button>
				{gpData && (
					<span className="text-zinc-400 text-sm">
						✅ <strong className="text-zinc-200">{gpData.event_name}</strong>
					</span>
				)}
			</div>

			{/* Real results */}
			{gpData && sessions.length > 0 && (
				<div className="flex flex-col gap-2">
					<h2 className="text-base font-semibold text-zinc-300">
						📊 Resultats reals
					</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{sessions.map((s) => (
							<details
								key={s}
								className="bg-zinc-900 border border-zinc-800 rounded-xl">
								<summary className="px-4 py-3 cursor-pointer text-sm font-medium hover:bg-zinc-800 rounded-xl">
									{SESSION_LABELS[s]}
								</summary>
								<div className="px-4 pb-3 overflow-x-auto">
									<table className="w-full text-xs mt-2">
										<thead>
											<tr className="text-zinc-500 border-b border-zinc-800">
												<th className="text-left py-1">Pos</th>
												<th className="text-left py-1">Driver</th>
												<th className="text-left py-1">Team</th>
											</tr>
										</thead>
										<tbody>
											{(gpData.results[s] || [])
												.sort((a, b) => a.Position - b.Position)
												.slice(0, 10)
												.map((r) => (
													<tr
														key={r.Abbreviation}
														className="border-b border-zinc-800/30">
														<td className="py-1 text-zinc-500">{r.Position}</td>
														<td className="py-1 font-mono">{r.Abbreviation}</td>
														<td className="py-1 text-zinc-400">
															{r.TeamName || r.Team || ""}
														</td>
													</tr>
												))}
										</tbody>
									</table>
								</div>
							</details>
						))}
					</div>
				</div>
			)}

			{/* Prediction cards */}
			{gpData && sessions.length > 0 && drivers.length > 0 && (
				<>
					<h2 className="text-base font-semibold text-zinc-300">
						🎯 Prediccions
					</h2>
					<div className="grid gap-4 sm:grid-cols-3">
						{users.map((user) => (
							<UserCard
								key={user}
								user={user}
								sessions={sessions}
								drivers={drivers}
								savedPredictions={savedPredictions}
								gpNumber={gpNumber}
							/>
						))}
					</div>

					<button
						onClick={() => calcMutation.mutate()}
						disabled={calcMutation.isPending}
						className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
						{calcMutation.isPending ? "🧮 Calculant…" : "🧮 Calcular punts!"}
					</button>
				</>
			)}

			<ResultsTable results={results} sessions={sessions} />
		</div>
	);
}
