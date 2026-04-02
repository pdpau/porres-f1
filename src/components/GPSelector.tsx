import type { GPCalendarEntry } from "../supabase-api";

interface GPSelectorProps {
	calendar: GPCalendarEntry[];
	selected: number;
	onSelect: (gpNumber: number) => void;
}

export default function GPSelector({
	calendar,
	selected,
	onSelect
}: GPSelectorProps) {
	return (
		<div className="flex items-center gap-3">
			<label className="text-sm text-zinc-500 whitespace-nowrap shrink-0">
				Grand Prix
			</label>
			<select
				value={selected}
				onChange={(e) => onSelect(Number(e.target.value))}
				className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-600 transition-colors flex-1 min-w-0">
				{calendar.map((gp) => (
					<option key={gp.number} value={gp.number}>
						R{String(gp.number).padStart(2, "0")} · {gp.name}
					</option>
				))}
			</select>
		</div>
	);
}
