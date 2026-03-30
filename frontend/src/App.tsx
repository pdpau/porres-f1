import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getConfig } from "./api";
import type { AppConfig } from "./api";
import GPSelector from "./components/GPSelector";
import PredictionForm from "./components/PredictionForm";
import SeasonStandings from "./components/SeasonStandings";

const queryClient = new QueryClient();

type Tab = "predictions" | "standings";

function AppContent() {
	const [config, setConfig] = useState<AppConfig | null>(null);
	const [selectedGP, setSelectedGP] = useState<number>(1);
	const [activeTab, setActiveTab] = useState<Tab>("predictions");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		getConfig()
			.then((cfg) => {
				setConfig(cfg);
				if (cfg.calendar.length > 0) {
					setSelectedGP(cfg.calendar[0].number);
				}
			})
			.catch((err) => setError(err.message));
	}, []);

	if (error) {
		return (
			<div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
				<div className="bg-red-900/20 border border-red-800 rounded-2xl p-6 max-w-md text-center">
					<p className="text-red-400 font-medium">
						Error carregant la configuració
					</p>
					<p className="text-zinc-400 text-sm mt-2">{error}</p>
				</div>
			</div>
		);
	}

	if (!config) {
		return (
			<div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
				<p className="text-zinc-500 animate-pulse">Carregant…</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			<div className="max-w-6xl mx-auto px-4 py-8">
				{/* Header */}
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
					<h1 className="text-2xl font-bold tracking-tight">
						🏎️ Porres F1 — {config.year}
					</h1>
					<GPSelector
						calendar={config.calendar}
						selected={selectedGP}
						onSelect={setSelectedGP}
					/>
				</header>

				{/* Tabs */}
				<nav className="flex gap-1 bg-zinc-900 rounded-xl p-1 mb-6 w-fit">
					<button
						onClick={() => setActiveTab("predictions")}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							activeTab === "predictions"
								? "bg-red-600 text-white"
								: "text-zinc-400 hover:text-zinc-200"
						}`}>
						🎯 Prediccions
					</button>
					<button
						onClick={() => setActiveTab("standings")}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							activeTab === "standings"
								? "bg-red-600 text-white"
								: "text-zinc-400 hover:text-zinc-200"
						}`}>
						🏆 Classificació
					</button>
				</nav>

				{/* Content */}
				{activeTab === "predictions" && (
					<PredictionForm gpNumber={selectedGP} users={config.users} />
				)}
				{activeTab === "standings" && (
					<SeasonStandings calendar={config.calendar} users={config.users} />
				)}
			</div>
		</div>
	);
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AppContent />
		</QueryClientProvider>
	);
}
