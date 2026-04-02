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

function AppContent() {
	const { user, isAdmin, logout } = useAuth();
	const [selectedGP, setSelectedGP] = useState<number>(
		calendar[0]?.number ?? 1
	);
	const [activeTab, setActiveTab] = useState<Tab>("porres");

	if (!user) return <LoginScreen />;

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
				{/* Header */}
				<header className="flex flex-col gap-4 mb-8">
					<div className="flex items-center justify-between">
						<h1 className="text-xl font-bold tracking-tight text-zinc-100">
							Porres F1{" "}
							<span className="text-zinc-500 font-normal">— {YEAR}</span>
						</h1>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-zinc-400">{user.name}</span>
							{isAdmin && (
								<span className="text-[10px] uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
									admin
								</span>
							)}
							<button
								onClick={logout}
								className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs">
								Sortir
							</button>
						</div>
					</div>
					<GPSelector
						calendar={calendar}
						selected={selectedGP}
						onSelect={setSelectedGP}
					/>
				</header>

				{/* Tabs */}
				<nav className="flex gap-0.5 bg-zinc-900/60 rounded-lg p-0.5 mb-6 border border-zinc-800/40 overflow-x-auto">
					<button
						onClick={() => setActiveTab("porres")}
						className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === "porres"
								? "bg-zinc-800 text-white shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						}`}>
						Porres
					</button>
					<button
						onClick={() => setActiveTab("results")}
						className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === "results"
								? "bg-zinc-800 text-white shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						}`}>
						Resultats
					</button>
					<button
						onClick={() => setActiveTab("scoring")}
						className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === "scoring"
								? "bg-zinc-800 text-white shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						}`}>
						Puntuació
					</button>
					<button
						onClick={() => setActiveTab("standings")}
						className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
							activeTab === "standings"
								? "bg-zinc-800 text-white shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						}`}>
						Classificació
					</button>
				</nav>

				{/* Content */}
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
			</div>
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
