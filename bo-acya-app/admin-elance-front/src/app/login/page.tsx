"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Invalid credentials");
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10 space-y-6 border border-border/50 animate-in fade-in duration-500 bg-card/50 backdrop-blur-md">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            ACYA // COMMAND CENTER
          </h1>
          <p className="text-sm text-muted-foreground">Sign in to manage the multi-tenant registry</p>
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
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-muted-foreground font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm font-mono cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "AUTHENTICATING..." : "ACCESS COMMAND CORE"}
          </button>
        </form>
      </div>
    </div>
  );
}
