import { useQuery } from "@tanstack/react-query";
import { getGPData } from "../supabase-api";
import type {
	GPData,
	SessionKey,
	DriverResult,
	RaceControlCounts
} from "../supabase-api";

const SESSION_ORDER: SessionKey[] = ["SS", "Sprint", "Qualifying", "Race"];

const SESSION_LABELS: Record<SessionKey, string> = {
	SS: "Sprint Qualifying",
	Sprint: "Sprint",
	Qualifying: "Qualifying",
	Race: "Race"
};

function isQualiSession(s: SessionKey): boolean {
	return s === "SS" || s === "Qualifying";
}

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

function formatGap(gap: number | string | null): string {
	if (gap == null) return "";
	if (typeof gap === "string") return gap;
	if (gap === 0) return "";
	return `+${gap.toFixed(3)}s`;
}

function getTimeDisplay(r: DriverResult, sessionKey: SessionKey): string {
	if (r.dnf || r.dns || r.dsq) return "";
	if (r.duration == null) return "";

	if (isQualiSession(sessionKey)) {
		if (Array.isArray(r.duration)) {
			for (let i = r.duration.length - 1; i >= 0; i--) {
				if (r.duration[i] != null) return formatTime(r.duration[i]);
			}
			return "";
		}
		return formatTime(r.duration);
	}

	if (r.Position === 1) {
		return typeof r.duration === "number" ? formatTime(r.duration) : "";
	}
	return formatGap(r.gap_to_leader);
}

function RaceControlBadges({ rc }: { rc: RaceControlCounts }) {
	if (rc.SC === 0 && rc.VSC === 0 && rc.RF === 0) return null;
	const scEvents = rc.events.filter((e) => e.type === "SC");
	const vscEvents = rc.events.filter((e) => e.type === "VSC");
	const rfEvents = rc.events.filter((e) => e.type === "RF");

	const formatLaps = (events: typeof scEvents) => {
		const laps = events.map((e) => e.lap).filter((l) => l != null);
		return laps.length > 0 ? ` (v. ${laps.join(", ")})` : "";
	};

	return (
		<div className="flex gap-2 flex-wrap mt-2">
			{scEvents.length > 0 && (
				<span className="inline-flex items-center gap-1 bg-amber-500/[0.08] text-amber-400/90 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/[0.12]">
					SC ×{scEvents.length}
					{formatLaps(scEvents)}
				</span>
			)}
			{vscEvents.length > 0 && (
				<span className="inline-flex items-center gap-1 bg-amber-500/[0.06] text-amber-500/70 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/[0.08]">
					VSC ×{vscEvents.length}
					{formatLaps(vscEvents)}
				</span>
			)}
			{rfEvents.length > 0 && (
				<span className="inline-flex items-center gap-1 bg-red-500/[0.08] text-red-400/90 text-[10px] font-semibold px-2 py-0.5 rounded border border-red-500/[0.12]">
					Red Flag ×{rfEvents.length}
					{formatLaps(rfEvents)}
				</span>
			)}
		</div>
	);
}

interface GPResultsProps {
	gpNumber: number;
}

export default function GPResults({ gpNumber }: GPResultsProps) {
	const {
		data: gpData,
		isLoading,
		error,
		refetch,
		isFetched
	} = useQuery<GPData>({
		queryKey: ["gpData", gpNumber],
		queryFn: () => getGPData(gpNumber),
		enabled: false,
		retry: false
	});

	const sessions: SessionKey[] = gpData
		? SESSION_ORDER.filter((s) => gpData.results?.[s])
		: [];

	return (
		<div className="flex flex-col gap-4">
			{/* Load bar */}
			<div className="flex items-center gap-3 flex-wrap">
				<button
					onClick={() => refetch()}
					disabled={isLoading}
					className="px-4 py-2.5 bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-30 text-white text-[13px] font-semibold rounded-lg transition-all duration-150">
					{isLoading ? "Carregant…" : "Carregar dades"}
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

			{error && (
				<p className="text-[13px] text-red-400 font-medium">
					{(error as Error).message}
				</p>
			)}

			{isFetched && !gpData && !error && (
				<p className="text-zinc-500 text-[13px]">
					No s'han trobat resultats per aquest GP.
				</p>
			)}

			{/* Session tables */}
			{gpData && sessions.length > 0 && (
				<div className="grid gap-3 lg:grid-cols-2">
					{sessions.map((s) => {
						const results = (gpData.results[s] ?? []).slice().sort((a, b) => {
							if (a.Position == null && b.Position == null) return 0;
							if (a.Position == null) return 1;
							if (b.Position == null) return -1;
							return a.Position - b.Position;
						});
						const rc = gpData.race_control?.[s];
						const isQual = isQualiSession(s);
						return (
							<div
								key={s}
								className="rounded-xl border border-white/[0.04] bg-[#111114] overflow-hidden">
								{/* Header */}
								<div className="px-4 py-3 border-b border-white/[0.04]">
									<div className="flex items-baseline justify-between">
										<h3 className="text-[12px] font-bold tracking-wider text-zinc-300 uppercase">
											{SESSION_LABELS[s]}
										</h3>
										{!isQual && results.length > 0 && (
											<span className="text-[11px] text-zinc-600">
												{results[0]?.number_of_laps || ""} voltes
											</span>
										)}
									</div>
									{rc && <RaceControlBadges rc={rc} />}
								</div>

								{/* Table */}
								<div className="overflow-x-auto">
									<table className="w-full text-[13px]">
										<thead>
											<tr className="text-zinc-600 text-[10px] uppercase tracking-wider font-semibold">
												<th className="text-left py-2 pl-4 pr-1 w-9">#</th>
												<th className="text-left py-2 pr-2">Pilot</th>
												<th className="text-left py-2 pr-2">Equip</th>
												<th className="text-right py-2 pr-2">
													{isQual ? "Temps" : "Gap"}
												</th>
												<th className="text-center py-2 pr-4 w-12"></th>
											</tr>
										</thead>
										<tbody>
											{results.map((r, i) => {
												const status = r.dnf
													? "DNF"
													: r.dns
														? "DNS"
														: r.dsq
															? "DSQ"
															: "";
												const timeStr = getTimeDisplay(r, s);
												const isTop3 = i < 3 && !status;
												return (
													<tr
														key={r.DriverNumber}
														className={`border-t border-white/[0.03] ${
															isTop3
																? "text-zinc-100"
																: status
																	? "text-zinc-600"
																	: "text-zinc-400"
														}`}>
														<td className="py-2 pl-4 pr-1 font-mono text-[12px] text-zinc-600 tabular-nums">
															{r.Position ?? "—"}
														</td>
														<td className="py-2 pr-2 font-mono font-semibold tracking-wide text-[13px]">
															{r.Abbreviation}
														</td>
														<td className="py-2 pr-2 text-zinc-500 text-[12px] whitespace-nowrap">
															<span
																className="inline-block w-[5px] h-[5px] rounded-full mr-1.5 align-middle"
																style={{
																	backgroundColor: `#${r.TeamColour || "666"}`
																}}
															/>
															{r.TeamName}
														</td>
														<td className="py-2 pr-2 text-right font-mono text-[12px] tabular-nums text-zinc-500">
															{timeStr}
														</td>
														<td className="py-2 pr-4 text-center text-[11px]">
															{status && (
																<span className="text-red-400/70 font-semibold">
																	{status}
																</span>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{gpData && sessions.length === 0 && (
				<p className="text-zinc-500 text-[13px]">
					Encara no hi ha resultats disponibles per aquest GP.
				</p>
			)}
		</div>
	);
}
