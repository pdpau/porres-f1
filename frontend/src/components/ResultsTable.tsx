import type { SessionBreakdown, UserResult } from "../api";

interface ResultsTableProps {
	results: Record<string, UserResult> | null;
	sessions: string[];
}

const REASON_LABELS: Record<string, string> = {
	exact_top5: "Top 5 exacte",
	exact_top3: "Top 3 exacte",
	top3_no_order: "Top 3 sense ordre",
	top5_no_order: "Top 5 sense ordre",
	extra_position: "Posició exacta",
	extra_sc_vsc_rf: "SC/VSC/RF",
	extra_dnf: "DNF"
};

export default function ResultsTable({ results, sessions }: ResultsTableProps) {
	if (!results) return null;

	const users = Object.keys(results);
	const sorted = [...users].sort(
		(a, b) => (results[b]?.total ?? 0) - (results[a]?.total ?? 0)
	);

	return (
		<div className="mt-6 flex flex-col gap-4">
			<h2 className="text-lg font-semibold">🏆 Classificació</h2>

			{/* ─── Summary table ─────────────────────────────────────────── */}
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-zinc-800 text-zinc-400">
							<th className="text-left py-2 pr-4">Pos</th>
							<th className="text-left py-2 pr-4">Participant</th>
							{sessions.map((s) => (
								<th key={s} className="py-2 px-3 text-center">
									{s}
								</th>
							))}
							<th className="py-2 px-3 text-center font-semibold text-white">
								TOTAL
							</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((user, i) => (
							<tr
								key={user}
								className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
								<td className="py-2 pr-4 text-zinc-500">{i + 1}</td>
								<td className="py-2 pr-4 font-medium">{user}</td>
								{sessions.map((s) => {
									const sessionData = results[user]?.[s] as
										| SessionBreakdown
										| undefined;
									return (
										<td key={s} className="py-2 px-3 text-center text-zinc-300">
											{sessionData?.total ?? 0}
										</td>
									);
								})}
								<td className="py-2 px-3 text-center font-bold text-red-400">
									{results[user]?.total ?? 0}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* ─── Detailed breakdown ────────────────────────────────────── */}
			<details className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
				<summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200">
					📋 Detall per participant
				</summary>
				<div className="mt-3 flex flex-col gap-3">
					{sorted.map((user) => (
						<div key={user}>
							<p className="font-medium">
								{user} —{" "}
								<span className="text-red-400">{results[user]?.total} pts</span>
							</p>
							{sessions.map((s) => {
								const sr = results[user]?.[s] as SessionBreakdown | undefined;
								if (!sr) return null;
								const reasons = Object.keys(sr)
									.filter((k) => k !== "total")
									.map((k) => REASON_LABELS[k] || k);
								return (
									<p key={s} className="text-sm text-zinc-400 ml-4">
										{s}:{" "}
										<strong className="text-zinc-200">{sr.total} pts</strong>
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
