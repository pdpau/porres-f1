import type { GPCalendarEntry } from "../api";

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
			<label className="text-sm text-zinc-400 whitespace-nowrap">
				Grand Prix
			</label>
			<select
				value={selected}
				onChange={(e) => onSelect(Number(e.target.value))}
				className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500 transition-colors">
				{calendar.map((gp) => (
					<option key={gp.number} value={gp.number}>
						R{String(gp.number).padStart(2, "0")} · {gp.name}
					</option>
				))}
			</select>
		</div>
	);
}
