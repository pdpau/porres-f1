import type { SessionBreakdown, UserResult } from "../supabase-api";

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
			<h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
				Puntuació
			</h2>

			{/* ─── Summary table ─────────────────────────────────────────── */}
			<div className="overflow-x-auto rounded-xl border border-white/[0.04] bg-[#111114]">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b border-white/[0.06] text-zinc-500">
							<th className="text-left py-2.5 pl-4 pr-2 text-[10px] font-semibold uppercase tracking-wider">
								Pos
							</th>
							<th className="text-left py-2.5 pr-4 text-[10px] font-semibold uppercase tracking-wider">
								Participant
							</th>
							{sessions.map((s) => (
								<th
									key={s}
									className="py-2.5 px-3 text-center text-[10px] font-semibold uppercase tracking-wider">
									{s}
								</th>
							))}
							<th className="py-2.5 px-3 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
								TOTAL
							</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((user, i) => (
							<tr
								key={user}
								className="border-b border-white/[0.03] last:border-0">
								<td className="py-2 pl-4 pr-2 text-zinc-600 tabular-nums font-mono">
									{i + 1}
								</td>
								<td className="py-2 pr-4 font-medium text-zinc-200">{user}</td>
								{sessions.map((s) => {
									const sessionData = results[user]?.[s] as
										| SessionBreakdown
										| undefined;
									return (
										<td
											key={s}
											className="py-2 px-3 text-center text-zinc-400 tabular-nums font-mono">
											{sessionData?.total ?? 0}
										</td>
									);
								})}
								<td className="py-2 px-3 text-center font-bold text-red-400 tabular-nums font-mono">
									{results[user]?.total ?? 0}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* ─── Detailed breakdown ────────────────────────────────────── */}
			<details className="rounded-xl border border-white/[0.04] bg-[#111114] p-4">
				<summary className="cursor-pointer text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
					Detall per participant
				</summary>
				<div className="mt-3 flex flex-col gap-3">
					{sorted.map((user) => (
						<div key={user}>
							<p className="font-medium text-[13px] text-zinc-200">
								{user} —{" "}
								<span className="text-red-400 tabular-nums font-mono">
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
									<p key={s} className="text-[12px] text-zinc-500 ml-4">
										{s}:{" "}
										<strong className="text-zinc-300 tabular-nums font-mono">
											{sr.total} pts
										</strong>
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
