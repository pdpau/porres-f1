import { useQuery } from "@tanstack/react-query";
import { getSeasonStandings } from "../supabase-api";
import type { GPCalendarEntry } from "../supabase-api";
import { USER_NAMES } from "../lib/config";

interface SeasonStandingsProps {
	calendar: GPCalendarEntry[];
}

export default function SeasonStandings({ calendar }: SeasonStandingsProps) {
	const users = USER_NAMES;
	const { data, isLoading } = useQuery({
		queryKey: ["seasonStandings"],
		queryFn: getSeasonStandings,
		refetchInterval: 30_000
	});

	if (isLoading)
		return (
			<p className="text-zinc-600 text-[13px] mt-6">Carregant classificació…</p>
		);

	const totals = data?.totals ?? {};
	const perGP = data?.per_gp ?? {};
	const sortedUsers = [...users].sort(
		(a, b) => (totals[b] || 0) - (totals[a] || 0)
	);
	const playedGPs = Object.keys(perGP)
		.map(Number)
		.sort((a, b) => a - b);

	const calMap = Object.fromEntries(calendar.map((g) => [g.number, g.name]));

	const positionStyles = [
		"border-amber-400/[0.15] bg-amber-400/[0.04]",
		"border-zinc-400/[0.12] bg-zinc-400/[0.03]",
		"border-orange-500/[0.12] bg-orange-500/[0.03]"
	];

	const positionColors = ["text-amber-400", "text-zinc-400", "text-orange-400"];

	return (
		<div className="flex flex-col gap-5">
			{/* Podium cards */}
			<div className="grid grid-cols-3 gap-2 sm:gap-3">
				{sortedUsers.map((user, i) => (
					<div
						key={user}
						className={`rounded-xl p-3 sm:p-5 border flex flex-col items-center gap-1.5 ${positionStyles[i]}`}>
						<span
							className={`text-[11px] font-bold uppercase tracking-widest ${positionColors[i]}`}>
							{i + 1}r
						</span>
						<span className="font-semibold text-[14px] sm:text-[17px] text-zinc-100">
							{user}
						</span>
						<span className="text-[26px] sm:text-[32px] font-bold text-red-400 leading-none tabular-nums">
							{totals[user] || 0}
						</span>
						<span className="text-[11px] text-zinc-600 font-medium">punts</span>
					</div>
				))}
			</div>

			{/* Per-GP breakdown */}
			{playedGPs.length > 0 && (
				<div className="overflow-x-auto rounded-xl border border-white/[0.04] bg-[#111114]">
					<table className="w-full text-[13px]">
						<thead>
							<tr className="border-b border-white/[0.04] text-zinc-500">
								<th className="text-left py-2.5 pl-4 pr-4 text-[11px] uppercase tracking-wider font-semibold">
									GP
								</th>
								{sortedUsers.map((u) => (
									<th
										key={u}
										className="py-2.5 px-3 text-center text-[11px] uppercase tracking-wider font-semibold">
										{u}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{playedGPs.map((gp) => (
								<tr
									key={gp}
									className="border-t border-white/[0.03] hover:bg-white/[0.01] transition-colors duration-100">
									<td className="py-2.5 pl-4 pr-4 text-zinc-300">
										<span className="text-zinc-600 mr-1.5 text-[11px] font-mono tabular-nums">
											R{String(gp).padStart(2, "0")}
										</span>
										{calMap[gp] || `GP ${gp}`}
									</td>
									{sortedUsers.map((u) => (
										<td
											key={u}
											className="py-2.5 px-3 text-center text-zinc-400 tabular-nums font-mono">
											{perGP[gp]?.[u] ?? "—"}
										</td>
									))}
								</tr>
							))}
							<tr className="border-t border-white/[0.06]">
								<td className="py-2.5 pl-4 pr-4 text-zinc-200 font-semibold text-[12px] uppercase tracking-wider">
									Total
								</td>
								{sortedUsers.map((u) => (
									<td
										key={u}
										className="py-2.5 px-3 text-center text-red-400 font-bold tabular-nums font-mono">
										{totals[u] || 0}
									</td>
								))}
							</tr>
						</tbody>
					</table>
				</div>
			)}

			{playedGPs.length === 0 && (
				<p className="text-zinc-600 text-[13px]">
					Encara no hi ha GPs calculats.
				</p>
			)}
		</div>
	);
}
