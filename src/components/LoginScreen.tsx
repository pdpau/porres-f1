import { useState } from "react";
import { useAuth } from "../lib/auth";
import { YEAR } from "../lib/config";

export default function LoginScreen() {
	const { login } = useAuth();
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const err = await login(name.trim(), password);
		setLoading(false);
		if (err) setError(err);
	};

	return (
		<div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
			<div className="w-full max-w-xs">
				<div className="text-center mb-8">
					<h1 className="text-xl font-bold text-zinc-100 tracking-tight">
						Porres F1 <span className="text-zinc-500 font-normal">— {YEAR}</span>
					</h1>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-[11px] text-zinc-500 uppercase tracking-wider">
							Nom
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
							autoComplete="username"
							className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
							placeholder="Albert, David o Pau"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-[11px] text-zinc-500 uppercase tracking-wider">
							Contrasenya
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
						/>
					</div>

					{error && (
						<p className="text-sm text-red-400">{error}</p>
					)}

					<button
						type="submit"
						disabled={loading || !name.trim() || !password}
						className="mt-1 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
					>
						{loading ? "Entrant…" : "Entrar"}
					</button>
				</form>
			</div>
		</div>
	);
}
