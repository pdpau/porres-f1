import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { YEAR, GP_CALENDAR } from "./lib/config";
import { AuthProvider, useAuth } from "./lib/auth";
import type { GPCalendarEntry } from "./supabase-api";
import LoginScreen from "./components/LoginScreen";
import GPSelector from "./components/GPSelector";
import GPResults from "./components/GPResults";
import PredictionForm from "./components/PredictionForm";
import ScoringTab from "./components/ScoringTab";
import SeasonStandings from "./components/SeasonStandings";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const queryClient = new QueryClient();

const calendar: GPCalendarEntry[] = GP_CALENDAR.map((g) => ({
	number: g.number,
	name: g.name
}));

type Tab = "porres" | "results" | "scoring" | "standings";

const TABS: { key: Tab; label: string; mobileLabel: string }[] = [
	{ key: "porres", label: "Porres", mobileLabel: "Porres" },
	{ key: "results", label: "Resultats", mobileLabel: "Resultats" },
	{ key: "scoring", label: "Puntuació", mobileLabel: "Punts" },
	{ key: "standings", label: "Classificació", mobileLabel: "Classi." }
];

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
	const cls = `w-5 h-5 transition-colors duration-150 ${active ? "text-red-400" : "text-zinc-600"}`;
	const p = {
		className: cls,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.75,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const
	};
	switch (tab) {
		case "porres":
			return (
				<svg {...p}>
					<path d="M12 20h9M16.5 3.5a2.121 2.121 0 113.536 3.536L6.5 20.5H3v-3.5L16.5 3.5z" />
				</svg>
			);
		case "results":
			return (
				<svg {...p}>
					<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
				</svg>
			);
		case "scoring":
			return (
				<svg {...p}>
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			);
		case "standings":
			return (
				<svg {...p}>
					<path d="M18 20V10M12 20V4M6 20v-6" />
				</svg>
			);
	}
}

function AppContent() {
	const { user, isAdmin, logout } = useAuth();
	const [selectedGP, setSelectedGP] = useState<number>(
		calendar[0]?.number ?? 1
	);
	const [activeTab, setActiveTab] = useState<Tab>("porres");

	if (!user) return <LoginScreen />;

	return (
		<div className="min-h-dvh bg-[#0a0a0c] text-zinc-100 flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-40 bg-[#0a0a0c]/85 backdrop-blur-xl border-b border-white/[0.04]">
				<div className="h-[2px] bg-gradient-to-r from-red-500 via-red-500/40 to-transparent" />
				<div className="max-w-5xl mx-auto px-4 sm:px-6">
					{/* Top bar */}
					<div className="flex items-center justify-between h-12">
						<div className="flex items-center gap-2.5">
							<h1 className="text-[15px] font-semibold tracking-[-0.01em]">
								Porres F1
								<span className="text-zinc-600 font-normal ml-1.5 text-[13px]">
									{YEAR}
								</span>
							</h1>
						</div>
						<div className="flex items-center gap-2.5">
							<span className="text-[13px] text-zinc-400 font-medium">
								{user.name}
							</span>
							{isAdmin && (
								<span className="text-[9px] uppercase tracking-widest text-amber-400/70 bg-amber-400/[0.07] px-1.5 py-[2px] rounded font-bold">
									admin
								</span>
							)}
							<span className="text-zinc-800 select-none">·</span>
							<button
								onClick={logout}
								className="text-zinc-600 hover:text-zinc-400 active:text-zinc-300 transition-colors duration-150 text-[12px] font-medium">
								Sortir
							</button>
						</div>
					</div>

					{/* GP selector + desktop tabs */}
					<div className="flex items-center gap-4 pb-2.5 md:pb-0">
						<div className="flex-1 md:flex-initial md:w-56">
							<GPSelector
								calendar={calendar}
								selected={selectedGP}
								onSelect={setSelectedGP}
							/>
						</div>
						<nav className="hidden md:flex items-center ml-auto">
							{TABS.map(({ key, label }) => (
								<button
									key={key}
									onClick={() => setActiveTab(key)}
									className={`px-3.5 py-3 text-[13px] font-medium transition-colors duration-150 relative ${
										activeTab === key
											? "text-white"
											: "text-zinc-500 hover:text-zinc-300"
									}`}>
									{label}
									{activeTab === key && (
										<span className="absolute bottom-0 inset-x-2 h-[2px] bg-red-500 rounded-full" />
									)}
								</button>
							))}
						</nav>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-5 md:py-8 pb-24 md:pb-8">
				{activeTab === "porres" && (
					<PredictionForm
						gpNumber={selectedGP}
						currentUser={user.name}
						isAdmin={isAdmin}
					/>
				)}
				{activeTab === "results" && <GPResults gpNumber={selectedGP} />}
				{activeTab === "scoring" && (
					<ScoringTab gpNumber={selectedGP} isAdmin={isAdmin} />
				)}
				{activeTab === "standings" && <SeasonStandings calendar={calendar} />}
			</main>

			{/* Mobile bottom nav */}
			<nav
				className="fixed bottom-0 inset-x-0 z-50 bg-[#0f0f12]/90 backdrop-blur-2xl border-t border-white/[0.04] md:hidden"
				style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
				<div className="flex justify-around items-center h-[52px]">
					{TABS.map(({ key, mobileLabel }) => (
						<button
							key={key}
							onClick={() => setActiveTab(key)}
							className={`flex flex-col items-center justify-center gap-[2px] min-w-[64px] py-1 transition-colors duration-150 ${
								activeTab === key ? "text-red-400" : "text-zinc-600"
							}`}>
							<TabIcon tab={key} active={activeTab === key} />
							<span className="text-[10px] font-semibold">{mobileLabel}</span>
						</button>
					))}
				</div>
			</nav>
		</div>
	);
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<Analytics />
				<SpeedInsights />
				<AppContent />
			</AuthProvider>
		</QueryClientProvider>
	);
}
