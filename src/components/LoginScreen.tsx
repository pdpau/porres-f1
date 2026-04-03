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
		<div className="min-h-dvh bg-[#0a0a0c] flex items-center justify-center px-6">
			<div className="w-full max-w-[320px]">
				{/* Brand */}
				<div className="text-center mb-10">
					<div className="flex justify-center mb-5">
						<span className="block w-8 h-[2px] bg-red-500 rounded-full" />
					</div>
					<h1 className="text-[22px] font-bold tracking-[-0.02em] text-zinc-100">
						Porres F1
					</h1>
					<p className="text-[13px] text-zinc-600 mt-1.5 font-medium">{YEAR}</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
							Nom
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
							autoComplete="username"
							className="bg-[#141417] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-[15px] text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.12] focus:ring-1 focus:ring-white/[0.06] transition-all duration-150"
							placeholder="Albert, David o Pau"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
							Contrasenya
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							className="bg-[#141417] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-[15px] text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.12] focus:ring-1 focus:ring-white/[0.06] transition-all duration-150"
						/>
					</div>

					{error && (
						<p className="text-[13px] text-red-400 font-medium">{error}</p>
					)}

					<button
						type="submit"
						disabled={loading || !name.trim() || !password}
						className="mt-2 py-2.5 bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-30 disabled:hover:bg-red-500 text-white text-[14px] font-semibold rounded-lg transition-all duration-150">
						{loading ? "Entrant…" : "Entrar"}
					</button>
				</form>
			</div>
		</div>
	);
}
