import { useQuery } from "@tanstack/react-query";
import { getSeasonStandings } from "../api";
import type { GPCalendarEntry } from "../api";

interface SeasonStandingsProps {
	calendar: GPCalendarEntry[];
	users: string[];
}

export default function SeasonStandings({
	calendar,
	users
}: SeasonStandingsProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["seasonStandings"],
		queryFn: getSeasonStandings,
		refetchInterval: 30_000
	});

	if (isLoading)
		return <p className="text-zinc-500 mt-6">Carregant classificació…</p>;

	const totals = data?.totals ?? {};
	const perGP = data?.per_gp ?? {};
	const sortedUsers = [...users].sort(
		(a, b) => (totals[b] || 0) - (totals[a] || 0)
	);
	const playedGPs = Object.keys(perGP)
		.map(Number)
		.sort((a, b) => a - b);

	const calMap = Object.fromEntries(calendar.map((g) => [g.number, g.name]));

	return (
		<div className="mt-6 flex flex-col gap-6">
			{/* Totals podium */}
			<div className="grid grid-cols-3 gap-4">
				{sortedUsers.map((user, i) => (
					<div
						key={user}
						className={`rounded-2xl p-5 border flex flex-col items-center gap-1 ${
							i === 0
								? "border-yellow-500/30 bg-yellow-500/5"
								: i === 1
									? "border-zinc-400/30 bg-zinc-400/5"
									: "border-orange-600/20 bg-orange-600/5"
						}`}>
						<span className="text-2xl">
							{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
						</span>
						<span className="font-semibold text-lg">{user}</span>
						<span className="text-3xl font-bold text-red-400">
							{totals[user] || 0}
						</span>
						<span className="text-xs text-zinc-500">punts</span>
					</div>
				))}
			</div>

			{/* Per-GP breakdown */}
			{playedGPs.length > 0 && (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-zinc-800 text-zinc-400">
								<th className="text-left py-2 pr-4">GP</th>
								{sortedUsers.map((u) => (
									<th key={u} className="py-2 px-4 text-center">
										{u}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{playedGPs.map((gp) => (
								<tr
									key={gp}
									className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
									<td className="py-2 pr-4 text-zinc-300">
										<span className="text-zinc-500 mr-2 text-xs">
											R{String(gp).padStart(2, "0")}
										</span>
										{calMap[gp] || `GP ${gp}`}
									</td>
									{sortedUsers.map((u) => (
										<td key={u} className="py-2 px-4 text-center text-zinc-300">
											{perGP[gp]?.[u] ?? "—"}
										</td>
									))}
								</tr>
							))}
							<tr className="border-t border-zinc-700 font-semibold">
								<td className="py-2 pr-4 text-zinc-200">TOTAL</td>
								{sortedUsers.map((u) => (
									<td
										key={u}
										className="py-2 px-4 text-center text-red-400 font-bold">
										{totals[u] || 0}
									</td>
								))}
							</tr>
						</tbody>
					</table>
				</div>
			)}

			{playedGPs.length === 0 && (
				<p className="text-zinc-500 text-sm">Encara no hi ha GPs calculats.</p>
			)}
		</div>
	);
}
