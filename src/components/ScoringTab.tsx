import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getGPData,
	getPredictions,
	calculatePoints,
	getGPScores
} from "../supabase-api";
import type {
	GPData,
	PredictionsMap,
	CalculateResponse,
	SessionKey,
	SessionBreakdown
} from "../supabase-api";
import { USER_NAMES, GP_CALENDAR } from "../lib/config";

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

const REASON_LABELS: Record<string, string> = {
	exact_top5: "Top 5 exacte",
	exact_top3: "Top 3 exacte",
	top3_no_order: "Top 3 sense ordre",
	top5_no_order: "Top 5 sense ordre",
	extra_position: "Posició exacta",
	extra_sc_vsc_rf: "SC/VSC/RF",
	extra_dnf: "DNF"
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTopN(
	results: { Position: number | null; Abbreviation: string }[],
	n: number
): string[] {
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

// ─── Comparison row per session ─────────────────────────────────────────────

interface SessionComparisonProps {
	session: SessionKey;
	gpData: GPData;
	predictions: PredictionsMap;
}

function SessionComparison({
	session,
	gpData,
	predictions
}: SessionComparisonProps) {
	const results = gpData.results[session];
	if (!results) return null;

	const topN = TOP_N[session];
	const actual = getTopN(results, topN);

	return (
		<div className="rounded-xl border border-white/[0.04] bg-[#111114] overflow-hidden">
			<div className="px-4 py-3 border-b border-white/[0.04]">
				<h3 className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase">
					{SESSION_LABELS[session]}
				</h3>
				<p className="text-[11px] text-zinc-600 mt-0.5">
					Resultat real:{" "}
					<span className="font-mono text-zinc-400 tabular-nums">
						{actual.join(", ")}
					</span>
				</p>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="text-zinc-600 text-[10px] uppercase tracking-wider font-semibold">
							<th className="text-left py-2 pl-4 pr-2">Participant</th>
							{Array.from({ length: topN }).map((_, i) => (
								<th key={i} className="py-2 px-2 text-center">
									P{i + 1}
								</th>
							))}
							<th className="py-2 px-2 text-left">Extra</th>
						</tr>
					</thead>
					<tbody>
						{/* Actual result row */}
						<tr className="border-t border-white/[0.04] bg-white/[0.02]">
							<td className="py-2 pl-4 pr-2 font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
								Resultat
							</td>
							{actual.map((driver, i) => (
								<td
									key={i}
									className="py-2 px-2 text-center font-mono font-semibold text-zinc-200 tabular-nums">
									{driver}
								</td>
							))}
							<td className="py-2 px-2 text-zinc-600 text-[12px]">—</td>
						</tr>

						{/* User prediction rows */}
						{USER_NAMES.map((user) => {
							const userPred = predictions[user]?.[session];
							if (!userPred) {
								return (
									<tr key={user} className="border-t border-white/[0.03]">
										<td className="py-2 pl-4 pr-2 text-zinc-400 font-medium">
											{user}
										</td>
										<td
											colSpan={topN + 1}
											className="py-2 px-2 text-zinc-700 text-[12px] italic">
											Sense porra
										</td>
									</tr>
								);
							}

							const picks = userPred.picks.slice(0, topN);
							const extra = userPred.extra;

							return (
								<tr key={user} className="border-t border-white/[0.03]">
									<td className="py-2 pl-4 pr-2 text-zinc-300 font-medium">
										{user}
									</td>
									{picks.map((pick, i) => {
										const isExact = pick === actual[i];
										const isInTop = actual.includes(pick);
										return (
											<td
												key={i}
												className={`py-2 px-2 text-center font-mono text-[13px] tabular-nums ${
													isExact
														? "text-emerald-400 font-semibold"
														: isInTop
															? "text-amber-400/80"
															: "text-zinc-600"
												}`}>
												{pick}
											</td>
										);
									})}
									<td className="py-2 px-2 text-[12px] text-zinc-600">
										{extra && extra.type !== "none"
											? extra.type === "position"
												? `P${extra.position} ${extra.driver}`
												: extra.type === "sc_vsc_rf"
													? `${extra.event_type} ×${extra.count}`
													: extra.type === "dnf"
														? `DNF ${extra.driver}`
														: ""
											: "—"}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// ─── Scoring Results Table ──────────────────────────────────────────────────

interface ScoringResultsProps {
	results: CalculateResponse;
	sessions: SessionKey[];
}

function ScoringResults({ results, sessions }: ScoringResultsProps) {
	const sorted = [...USER_NAMES].sort(
		(a, b) => (results[b]?.total ?? 0) - (results[a]?.total ?? 0)
	);

	return (
		<div className="flex flex-col gap-4 mt-5">
			<h3 className="text-[12px] font-bold uppercase tracking-wider text-zinc-400">
				Puntuació calculada
			</h3>

			{/* Summary table */}
			<div className="overflow-x-auto rounded-xl border border-white/[0.04] bg-[#111114]">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b border-white/[0.04] text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
							<th className="text-left py-2.5 pl-4 pr-4">#</th>
							<th className="text-left py-2.5 pr-4">Participant</th>
							{sessions.map((s) => (
								<th key={s} className="py-2.5 px-3 text-center">
									{SESSION_LABELS[s]}
								</th>
							))}
							<th className="py-2.5 px-3 text-center text-zinc-300">TOTAL</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((user, i) => (
							<tr
								key={user}
								className="border-t border-white/[0.03] hover:bg-white/[0.01] transition-colors duration-100">
								<td className="py-2.5 pl-4 pr-4 text-zinc-600 tabular-nums font-mono">
									{i + 1}
								</td>
								<td className="py-2.5 pr-4 font-medium text-zinc-200">
									{user}
								</td>
								{sessions.map((s) => {
									const sd = results[user]?.[s] as SessionBreakdown | undefined;
									return (
										<td
											key={s}
											className="py-2.5 px-3 text-center text-zinc-400 tabular-nums font-mono">
											{sd?.total ?? 0}
										</td>
									);
								})}
								<td className="py-2.5 px-3 text-center font-bold text-red-400 tabular-nums font-mono">
									{results[user]?.total ?? 0}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Breakdown */}
			<details className="rounded-xl border border-white/[0.04] bg-[#111114] p-4">
				<summary className="cursor-pointer text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors duration-150 font-medium">
					Detall per participant
				</summary>
				<div className="mt-3 flex flex-col gap-3">
					{sorted.map((user) => (
						<div key={user}>
							<p className="font-medium text-[14px]">
								{user} —{" "}
								<span className="text-red-400 tabular-nums">
									{results[user]?.total} pts
								</span>
							</p>
							{sessions.map((s) => {
								const sr = results[user]?.[s] as SessionBreakdown | undefined;
								if (!sr) return null;
								const reasons = Object.keys(sr)
									.filter((k) => k !== "total")
									.map((k) => REASON_LABELS[k] || k);
								return (
									<p key={s} className="text-[13px] text-zinc-500 ml-4">
										{SESSION_LABELS[s]}:{" "}
										<strong className="text-zinc-300">{sr.total} pts</strong>
										{reasons.length > 0 && ` (${reasons.join(", ")})`}
									</p>
								);
							})}
						</div>
					))}
				</div>
			</details>
		</div>
	);
}

// ─── ScoringTab (main export) ───────────────────────────────────────────────

interface ScoringTabProps {
	gpNumber: number;
	isAdmin: boolean;
}

export default function ScoringTab({ gpNumber, isAdmin }: ScoringTabProps) {
	const qc = useQueryClient();

	// Load saved scores — if they exist, the GP is "closed"
	const { data: savedScores, isLoading: scoresLoading } = useQuery({
		queryKey: ["gpScores", gpNumber],
		queryFn: () => getGPScores(gpNumber)
	});

	const isClosed = !!savedScores;

	const {
		data: gpData,
		isLoading: gpLoading,
		error: gpError,
		refetch,
		isFetched
	} = useQuery<GPData>({
		queryKey: ["gpData", gpNumber],
		queryFn: () => getGPData(gpNumber),
		enabled: false,
		retry: false
	});

	const { data: predictions } = useQuery<PredictionsMap>({
		queryKey: ["predictions", gpNumber],
		queryFn: () => getPredictions(gpNumber)
	});

	const calcMutation = useMutation({
		mutationFn: () => calculatePoints(gpNumber, gpData),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["gpScores", gpNumber] });
			qc.invalidateQueries({ queryKey: ["seasonStandings"] });
		}
	});

	const sessions: SessionKey[] = gpData
		? SESSION_ORDER.filter((s) => gpData.results?.[s])
		: [];

	// For closed GPs, derive sessions from config (sprint flag)
	const gpConfig = GP_CALENDAR.find((g) => g.number === gpNumber);
	const gpName = gpConfig?.name ?? `GP ${gpNumber}`;
	const closedSessions: SessionKey[] = gpConfig?.sprint
		? ["SS", "Sprint", "Qualifying", "Race"]
		: ["Qualifying", "Race"];

	// Which scores to show: freshly calculated, or saved from DB
	const displayScores = calcMutation.data ?? savedScores;
	const displaySessions = sessions.length > 0 ? sessions : closedSessions;

	if (scoresLoading) {
		return (
			<p className="text-zinc-600 text-[13px] mt-6">Carregant puntuació…</p>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-baseline gap-2 flex-wrap">
				<h2 className="text-[13px] font-medium text-zinc-400">
					Puntuació —{" "}
					<span className="text-zinc-200 font-semibold">{gpName}</span>
				</h2>
				{isClosed && (
					<span className="text-[9px] uppercase tracking-widest text-emerald-400/60 bg-emerald-400/[0.06] px-1.5 py-0.5 rounded border border-emerald-400/[0.1] font-bold">
						calculat
					</span>
				)}
			</div>

			{/* If GP is closed, show saved scores immediately */}
			{isClosed && displayScores && (
				<ScoringResults results={displayScores} sessions={displaySessions} />
			)}

			{/* Load data button — for comparison view / admin recalculation */}
			{(!isClosed || isAdmin) && (
				<div className="flex items-center gap-3 flex-wrap">
					<button
						onClick={() => refetch()}
						disabled={gpLoading}
						className="px-4 py-2.5 bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-30 text-white text-[13px] font-semibold rounded-lg transition-all duration-150">
						{gpLoading
							? "Carregant dades…"
							: gpData
								? "Recarregar dades"
								: "Carregar dades del GP"}
					</button>
					{gpData && (
						<p className="text-[13px] text-zinc-400">
							<span className="font-medium text-zinc-200">
								{gpData.event_name}
							</span>
							{" · "}
							<span className="text-zinc-500">
								{gpData.event_format === "sprint_qualifying"
									? "Sprint"
									: "Convencional"}
							</span>
						</p>
					)}
				</div>
			)}

			{gpError && (
				<p className="text-[13px] text-red-400 font-medium">
					{(gpError as Error).message}
				</p>
			)}

			{isFetched && !gpData && !gpError && (
				<p className="text-zinc-600 text-[13px]">
					No s'han trobat resultats per aquest GP.
				</p>
			)}

			{/* Comparisons: predictions vs real results */}
			{gpData && predictions && sessions.length > 0 && (
				<>
					<div className="grid gap-3 lg:grid-cols-2">
						{sessions.map((s) => (
							<SessionComparison
								key={s}
								session={s}
								gpData={gpData}
								predictions={predictions}
							/>
						))}
					</div>

					{/* Legend */}
					<div className="flex gap-4 text-[11px] text-zinc-600 flex-wrap">
						<span>
							<span className="text-emerald-400 font-semibold">verd</span> =
							posició exacta
						</span>
						<span>
							<span className="text-amber-400/80 font-semibold">groc</span> =
							dins del top però fora de posició
						</span>
					</div>

					{/* Calculate button — admin only */}
					{isAdmin && (
						<button
							onClick={() => calcMutation.mutate()}
							disabled={calcMutation.isPending}
							className="w-full py-3 bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-30 text-white text-[14px] font-semibold rounded-lg transition-all duration-150">
							{calcMutation.isPending
								? "Calculant…"
								: isClosed
									? "Recalcular i desar puntuació"
									: "Calcular i desar puntuació"}
						</button>
					)}

					{/* Show freshly calculated results if different from saved */}
					{calcMutation.data && !savedScores && (
						<ScoringResults results={calcMutation.data} sessions={sessions} />
					)}
				</>
			)}

			{gpData && sessions.length === 0 && (
				<p className="text-zinc-600 text-[13px]">
					Encara no hi ha resultats de sessions per calcular la puntuació.
				</p>
			)}

			{!gpData && !gpLoading && !isClosed && (
				<p className="text-zinc-600 text-[13px]">
					Carrega les dades del GP per veure les porres comparades amb els
					resultats reals.
				</p>
			)}
		</div>
	);
}
