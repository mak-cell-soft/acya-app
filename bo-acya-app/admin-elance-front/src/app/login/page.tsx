"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Invalid credentials" }));
        throw new Error(data.error || "Invalid credentials");
      }

      router.push("/");
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "An error occurred";
      setError(msg.slice(0, 200));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-background px-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10 space-y-6 border border-border/50 animate-in fade-in duration-500 bg-card/50 backdrop-blur-md">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <svg className="w-12 h-12 transition-transform duration-700 hover:scale-110 drop-shadow-sm animate-pulse" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo_grad_1" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#60A5FA"/>
                  <stop offset="100%" stopColor="#3B82F6"/>
                </linearGradient>
                <linearGradient id="logo_grad_2" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#3B82F6"/>
                  <stop offset="100%" stopColor="#2563EB"/>
                </linearGradient>
                <linearGradient id="logo_grad_3" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#2563EB"/>
                  <stop offset="100%" stopColor="#1D4ED8"/>
                </linearGradient>
              </defs>
              <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#logo_grad_1)" />
              <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#logo_grad_2)" />
              <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#logo_grad_3)" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
              ACYA // COMMAND CENTER
            </h1>
            <p className="text-sm text-muted-foreground">Sign in to manage the multi-tenant registry</p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-muted-foreground font-medium" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              maxLength={128}
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] text-foreground"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-muted-foreground font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                maxLength={128}
                className="w-full pl-4 pr-11 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] text-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 p-2 text-muted-foreground hover:text-foreground transition-[color,transform] active:scale-[0.96] rounded-md flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 transition-all duration-200" />
                ) : (
                  <Eye className="w-4 h-4 transition-all duration-200" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 active:scale-[0.96] transition-[transform,background-color] text-sm font-mono cursor-pointer flex items-center justify-center gap-2 select-none"
          >
            {loading ? "AUTHENTICATING..." : "ACCESS COMMAND CORE"}
          </button>
        </form>
      </div>
    </div>
  );
}
