import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPredictions, savePrediction } from "../supabase-api";
import type {
	ExtraPrediction,
	PredictionsMap,
	SessionKey,
} from "../supabase-api";
import { USER_NAMES, GP_CALENDAR, DRIVERS } from "../lib/config";

// ─── Constants ──────────────────────────────────────────────────────────────

const SESSION_LABELS: Record<SessionKey, string> = {
	SS: "Sprint Qualifying",
	Sprint: "Sprint",
	Qualifying: "Qualifying",
	Race: "Race",
};

const TOP_N: Record<SessionKey, number> = {
	Race: 5,
	Sprint: 5,
	Qualifying: 3,
	SS: 3,
};

const EXTRA_OPTIONS = ["Cap", "Posició exacta", "SC/VSC/RF", "DNF"] as const;

const LOCK_MINUTES = 15;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSessionsForGP(gpNumber: number): SessionKey[] {
	const gp = GP_CALENDAR.find((g) => g.number === gpNumber);
	if (!gp) return ["Qualifying", "Race"];
	return gp.sprint
		? ["SS", "Sprint", "Qualifying", "Race"]
		: ["Qualifying", "Race"];
}

function isLocked(savedAt: string | undefined): boolean {
	if (!savedAt) return false;
	const elapsed = Date.now() - new Date(savedAt).getTime();
	return elapsed > LOCK_MINUTES * 60 * 1000;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface DriverSelectProps {
	drivers: string[];
	value: string;
	onChange: (v: string) => void;
	label: string;
	disabled?: boolean;
}

function DriverSelect({ drivers, value, onChange, label, disabled }: DriverSelectProps) {
	return (
		<div className="flex flex-col gap-1">
			<label className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</label>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className="bg-zinc-800 border border-zinc-700/50 rounded-md px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-zinc-500 transition-colors min-w-18 disabled:opacity-40 disabled:cursor-not-allowed">
				{drivers.map((d) => (
					<option key={d} value={d}>{d}</option>
				))}
			</select>
		</div>
	);
}

// ─── ExtraPoint ─────────────────────────────────────────────────────────────

interface ExtraPointProps {
	drivers: string[];
	extra: ExtraPrediction;
	onChange: (e: ExtraPrediction) => void;
	disabled?: boolean;
}

function ExtraPoint({ drivers, extra, onChange, disabled }: ExtraPointProps) {
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
			onChange({ type: "position", driver: drivers[5] || drivers[0], position: 6 });
		else if (label === "SC/VSC/RF")
			onChange({ type: "sc_vsc_rf", event_type: "SC", count: 0 });
		else if (label === "DNF")
			onChange({ type: "dnf", driver: drivers[0] });
	};

	return (
		<div className="bg-zinc-800/30 rounded-lg p-3 flex flex-col gap-2 border border-zinc-800/40">
			<div className="flex items-center gap-2">
				<span className="text-[11px] text-zinc-500 uppercase tracking-wider">Punt extra</span>
				<select
					value={typeLabel}
					onChange={(e) => setType(e.target.value)}
					disabled={disabled}
					className="ml-auto bg-zinc-800 border border-zinc-700/50 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed">
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
						disabled={disabled}
					/>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-zinc-500">Posició</label>
						<input
							type="number"
							min={6}
							max={20}
							value={extra.position ?? 6}
							onChange={(e) => onChange({ ...extra, position: parseInt(e.target.value) })}
							disabled={disabled}
							className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
							onChange={(e) => onChange({ ...extra, event_type: e.target.value as "SC" | "VSC" | "RF" })}
							disabled={disabled}
							className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed">
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
							onChange={(e) => onChange({ ...extra, count: parseInt(e.target.value) })}
							disabled={disabled}
							className="w-16 bg-zinc-800 border border-zinc-700/50 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
					disabled={disabled}
				/>
			)}
		</div>
	);
}

// ─── SessionCard (one session within a user card) ───────────────────────────

interface SessionCardProps {
	user: string;
	session: SessionKey;
	drivers: string[];
	savedPredictions: PredictionsMap | undefined;
	gpNumber: number;
	canEdit: boolean;
}

function SessionCard({ user, session, drivers, savedPredictions, gpNumber, canEdit }: SessionCardProps) {
	const qc = useQueryClient();
	const savedData = savedPredictions?.[user]?.[session];
	const locked = canEdit && isLocked(savedData?.saved_at);

	const defaultPicks = useMemo(() => {
		if (savedData?.picks) return savedData.picks;
		return drivers.slice(0, TOP_N[session]);
	}, [savedData, drivers, session]);

	const defaultExtra = useMemo((): ExtraPrediction => {
		return (savedData?.extra as ExtraPrediction) || { type: "none" };
	}, [savedData]);

	const [picks, setPicks] = useState<string[]>(defaultPicks);
	const [extras, setExtras] = useState<ExtraPrediction>(defaultExtra);

	useEffect(() => {
		setPicks(defaultPicks);
		setExtras(defaultExtra);
	}, [defaultPicks, defaultExtra]);

	const saveMutation = useMutation({
		mutationFn: () => savePrediction(gpNumber, user, session, picks, extras),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions", gpNumber] }),
	});

	const updatePick = (idx: number, driver: string) => {
		setPicks((prev) => {
			const next = [...prev];
			next[idx] = driver;
			return next;
		});
	};

	const hasChanged = (): boolean => {
		if (!savedData) return true;
		return (
			JSON.stringify(savedData.picks) !== JSON.stringify(picks) ||
			JSON.stringify(savedData.extra) !== JSON.stringify(extras)
		);
	};

	// Read-only view
	if (!canEdit) {
		if (!savedData) {
			return (
				<div className="flex items-center gap-2 py-1.5">
					<span className="text-sm text-zinc-500 w-32">{SESSION_LABELS[session]}</span>
					<span className="text-xs text-zinc-600 italic">Sense porra</span>
				</div>
			);
		}
		return (
			<div className="flex flex-col gap-1 py-1.5">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm text-zinc-500 w-32">{SESSION_LABELS[session]}</span>
					<span className="text-sm font-mono text-zinc-300">{savedData.picks.join(", ")}</span>
					{savedData.extra && savedData.extra.type !== "none" && (
						<span className="text-xs text-zinc-500 ml-1">
							+ {savedData.extra.type === "position"
								? `P${savedData.extra.position} ${savedData.extra.driver}`
								: savedData.extra.type === "sc_vsc_rf"
									? `${savedData.extra.event_type} ×${savedData.extra.count}`
									: savedData.extra.type === "dnf"
										? `DNF ${savedData.extra.driver}`
										: ""}
						</span>
					)}
				</div>
			</div>
		);
	}

	// Locked view (was editable but 15 min passed)
	if (locked) {
		return (
			<div className="flex flex-col gap-1 py-1.5">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm text-zinc-500 w-32">{SESSION_LABELS[session]}</span>
					<span className="text-sm font-mono text-zinc-300">{savedData!.picks.join(", ")}</span>
					{savedData!.extra && savedData!.extra.type !== "none" && (
						<span className="text-xs text-zinc-500 ml-1">
							+ {savedData!.extra.type === "position"
								? `P${savedData!.extra.position} ${savedData!.extra.driver}`
								: savedData!.extra.type === "sc_vsc_rf"
									? `${savedData!.extra.event_type} ×${savedData!.extra.count}`
									: savedData!.extra.type === "dnf"
										? `DNF ${savedData!.extra.driver}`
										: ""}
						</span>
					)}
					<span className="text-[10px] text-amber-500/60 border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 rounded ml-auto">blocat</span>
				</div>
			</div>
		);
	}

	// Editable view
	return (
		<div className="flex flex-col gap-3 py-2">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-zinc-300">{SESSION_LABELS[session]}</span>
				<button
					onClick={() => saveMutation.mutate()}
					disabled={saveMutation.isPending || !hasChanged()}
					className={`text-xs px-3 py-1 rounded-md transition-colors ${
						!hasChanged()
							? "bg-emerald-900/40 text-emerald-400 border border-emerald-800/30 cursor-default"
							: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40"
					}`}>
					{saveMutation.isPending ? "…" : !hasChanged() ? "✓ Desat" : "Desar"}
				</button>
			</div>

			<div className="flex gap-2 flex-wrap">
				{Array.from({ length: TOP_N[session] }).map((_, i) => (
					<DriverSelect
						key={i}
						label={`P${i + 1}`}
						drivers={drivers}
						value={picks[i] || drivers[i] || ""}
						onChange={(v) => updatePick(i, v)}
					/>
				))}
			</div>

			<ExtraPoint
				drivers={drivers}
				extra={extras}
				onChange={(e) => setExtras(e)}
			/>
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
	canEdit: boolean;
	isAdmin: boolean;
}

function UserCard({ user, sessions, drivers, savedPredictions, gpNumber, canEdit, isAdmin }: UserCardProps) {
	const hasPredictions = sessions.some((s) => savedPredictions?.[user]?.[s]);

	return (
		<div className={`rounded-lg border bg-zinc-900/50 p-5 flex flex-col gap-2 ${
			canEdit ? "border-zinc-700/50" : "border-zinc-800/40"
		}`}>
			<div className="flex items-center gap-2 border-b border-zinc-800/40 pb-3">
				<h2 className="text-base font-semibold">{user}</h2>
				{canEdit && (
					<span className="text-[10px] uppercase tracking-wider text-emerald-500/60">editable</span>
				)}
				{!hasPredictions && (
					<span className="text-xs text-zinc-600 ml-auto">Sense porres</span>
				)}
			</div>

			{sessions.map((session) => (
				<SessionCard
					key={session}
					user={user}
					session={session}
					drivers={drivers}
					savedPredictions={savedPredictions}
					gpNumber={gpNumber}
					canEdit={canEdit || isAdmin}
				/>
			))}
		</div>
	);
}

// ─── PredictionForm (main export) ───────────────────────────────────────────

interface PredictionFormProps {
	gpNumber: number;
	currentUser: string;
	isAdmin: boolean;
}

export default function PredictionForm({ gpNumber, currentUser, isAdmin }: PredictionFormProps) {
	const sessions = getSessionsForGP(gpNumber);
	const drivers = DRIVERS;

	const { data: savedPredictions } = useQuery<PredictionsMap>({
		queryKey: ["predictions", gpNumber],
		queryFn: () => getPredictions(gpNumber),
	});

	const gpName = GP_CALENDAR.find((g) => g.number === gpNumber)?.name ?? `GP ${gpNumber}`;

	return (
		<div className="mt-6 flex flex-col gap-6">
			<div className="flex items-baseline gap-2">
				<h2 className="text-sm font-medium text-zinc-400">
					Porres —{" "}
					<span className="text-zinc-300">{gpName}</span>
				</h2>
				<span className="text-[11px] text-zinc-600">
					{sessions.length === 4 ? "Sprint weekend" : "Convencional"} · {sessions.length} sessions
				</span>
			</div>

			{/* Current user first (always editable) */}
			<UserCard
				user={currentUser}
				sessions={sessions}
				drivers={drivers}
				savedPredictions={savedPredictions}
				gpNumber={gpNumber}
				canEdit={true}
				isAdmin={isAdmin}
			/>

			{/* Other users (read-only, or editable if admin) */}
			{USER_NAMES.filter((u) => u !== currentUser).map((otherUser) => (
				<UserCard
					key={otherUser}
					user={otherUser}
					sessions={sessions}
					drivers={drivers}
					savedPredictions={savedPredictions}
					gpNumber={gpNumber}
					canEdit={isAdmin}
					isAdmin={isAdmin}
				/>
			))}

			<p className="text-[11px] text-zinc-600 text-center">
				Un cop desada, la porra es bloqueja al cap de {LOCK_MINUTES} minuts.
				{isAdmin && " (admin pot editar sempre)"}
			</p>
		</div>
	);
}
