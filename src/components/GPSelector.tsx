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
		<select
			value={selected}
			onChange={(e) => onSelect(Number(e.target.value))}
			className="w-full bg-[#141417] border border-white/[0.06] rounded-lg px-3 py-2 pr-8 text-[13px] font-medium text-zinc-200 focus:outline-none focus:border-white/[0.12] transition-colors duration-150 min-h-[40px]">
			{calendar.map((gp) => (
				<option key={gp.number} value={gp.number}>
					R{String(gp.number).padStart(2, "0")} · {gp.name}
				</option>
			))}
		</select>
	);
}
