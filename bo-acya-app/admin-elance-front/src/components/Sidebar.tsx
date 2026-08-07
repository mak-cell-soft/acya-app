"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Lock, 
  X, 
  Key, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  Shield, 
  CreditCard, 
  Activity, 
  ClipboardList, 
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'username' | 'password'>('username');
  
  const [username, setUsername] = useState('admin');
  const [newUsernameInput, setNewUsernameInput] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const stored = localStorage.getItem("sidebar_collapsed");
      if (stored === "true") {
        setIsCollapsed(true);
      }
      const storedUser = localStorage.getItem("username");
      if (storedUser) {
        setUsername(storedUser);
        setNewUsernameInput(storedUser);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem("sidebar_collapsed", String(nextVal));
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsernameInput || newUsernameInput.trim().length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/update-username", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ newUsername: newUsernameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec de la mise à jour du nom d'utilisateur");
      }

      if (data.username) {
        setUsername(data.username);
        localStorage.setItem("username", data.username);
      }
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      setSuccess("Nom d'utilisateur mis à jour avec succès");
      setTimeout(() => {
        setIsPasswordOpen(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/auth/update-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update password");
      }

      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordOpen(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getLinkClasses = (href: string) => {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
    const base = "flex items-center rounded-md text-sm transition-all duration-200 border";
    const layout = (mounted && isCollapsed) ? "justify-center p-2.5" : "gap-3 px-3 py-2.5";
    const colors = isActive
      ? "font-semibold bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
      : "font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent hover:scale-[1.01]";
    return `${base} ${layout} ${colors}`;
  };

  return (
    <aside className={`border-r border-border bg-card flex flex-col h-full shrink-0 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className={`h-16 flex items-center justify-between border-b border-border px-4 ${isCollapsed ? 'justify-center' : ''}`}>
        {(!isCollapsed || !mounted) && (
          <div className="flex items-center gap-3 overflow-hidden select-none">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <h1 className="text-[1.05rem] font-bold font-mono tracking-tight text-gradient">ACYA // OMEGA</h1>
          </div>
        )}
        {isCollapsed && mounted && (
          <svg className="w-7 h-7 shrink-0 select-none cursor-pointer" onClick={toggleCollapse} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <use href="#logo-sym" />
            <defs>
              <linearGradient id="logo_grad_1b" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#60A5FA"/>
                <stop offset="100%" stopColor="#3B82F6"/>
              </linearGradient>
              <linearGradient id="logo_grad_2b" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#2563EB"/>
              </linearGradient>
              <linearGradient id="logo_grad_3b" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#2563EB"/>
                <stop offset="100%" stopColor="#1D4ED8"/>
              </linearGradient>
            </defs>
            <path d="M 20 3 L 27.79 7.5 L 27.79 16.5 L 20 21 L 12.21 16.5 L 12.21 7.5 Z" fill="url(#logo_grad_1b)" />
            <path d="M 11.34 18 L 19.13 22.5 L 19.13 31.5 L 11.34 36 L 3.55 31.5 L 3.55 22.5 Z" fill="url(#logo_grad_2b)" />
            <path d="M 28.66 18 L 36.45 22.5 L 36.45 31.5 L 28.66 36 L 20.87 31.5 L 20.87 22.5 Z" fill="url(#logo_grad_3b)" />
          </svg>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {(!isCollapsed || !mounted) && (
          <div className="text-[10px] uppercase text-muted-foreground font-mono font-bold tracking-wider mb-2 mt-4 px-3 select-none">
            Command Core
          </div>
        )}
        <Link 
          href="/" 
          className={getLinkClasses('/')}
          title={isCollapsed ? "Overview" : undefined}
        >
          <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
          {(!isCollapsed || !mounted) && <span>Overview</span>}
        </Link>
        
        <Link 
          href="/enterprises" 
          className={getLinkClasses('/enterprises')}
          title={isCollapsed ? "Enterprises Registry" : undefined}
        >
          <Shield className="w-4.5 h-4.5 shrink-0" />
          {(!isCollapsed || !mounted) && <span>Enterprises Registry</span>}
        </Link>

        <Link 
          href="/billing" 
          className={getLinkClasses('/billing')}
          title={isCollapsed ? "Billing & Invoices" : undefined}
        >
          <CreditCard className="w-4.5 h-4.5 shrink-0" />
          {(!isCollapsed || !mounted) && <span>Billing & Invoices</span>}
        </Link>

        <Link 
          href="/monitoring" 
          className={getLinkClasses('/monitoring')}
          title={isCollapsed ? "Monitoring & Resource Stats" : undefined}
        >
          <Activity className="w-4.5 h-4.5 shrink-0" />
          {(!isCollapsed || !mounted) && <span>Monitoring & Resource Stats</span>}
        </Link>

        <Link 
          href="/audit-logs" 
          className={getLinkClasses('/audit-logs')}
          title={isCollapsed ? "Audit Logs" : undefined}
        >
          <ClipboardList className="w-4.5 h-4.5 shrink-0" />
          {(!isCollapsed || !mounted) && <span>Audit Logs</span>}
        </Link>

        {(!isCollapsed || !mounted) && (
          <div className="text-[10px] uppercase text-muted-foreground font-mono font-bold tracking-wider mb-2 mt-6 px-3 select-none">
            System
          </div>
        )}
        <Link 
          href="/settings" 
          className={getLinkClasses('/settings')}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className="w-4.5 h-4.5 shrink-0" />
          {(!isCollapsed || !mounted) && <span>Settings</span>}
        </Link>
      </nav>
      
      <div className={`p-3 border-t border-border ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={() => {
            setError('');
            setSuccess('');
            setIsPasswordOpen(true);
          }}
          className={`flex items-center rounded-lg hover:bg-secondary transition-colors cursor-pointer group ${isCollapsed ? 'justify-center p-1.5' : 'gap-3 px-3 py-2 w-full text-left'}`}
          title={isCollapsed ? "SA Credentials" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-mono text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 uppercase font-bold">
            {username.slice(0, 2)}
          </div>
          {(!isCollapsed || !mounted) && (
            <>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors truncate">Super Admin</span>
                <span className="text-xs text-muted-foreground mt-1 font-mono truncate">@{username}</span>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </>
          )}
        </button>
      </div>

      {isPasswordOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => {
                setIsPasswordOpen(false);
                setError('');
                setSuccess('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 bg-zinc-800/50 hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-mono tracking-tight text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                  SYSTEM CREDENTIALS
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">Modify the system operator username or password</p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-zinc-800/50 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => { setActiveTab('username'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg transition-all text-center ${activeTab === 'username' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                USERNAME
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg transition-all text-center ${activeTab === 'password' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                PASSWORD
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-mono">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-mono">
                {success}
              </div>
            )}

            {activeTab === 'username' ? (
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                    Current Username
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-800 rounded-lg text-sm font-mono text-muted-foreground cursor-not-allowed"
                    value={username}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                    New Username
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={64}
                    className="w-full px-4 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm font-mono focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] text-foreground"
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value)}
                    placeholder="e.g. admin_operator"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">Min 3 characters. Alphanumeric, dots, hyphens, and underscores only.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordOpen(false)}
                    className="px-4 py-2 text-xs font-mono bg-zinc-800 text-muted-foreground rounded-lg hover:bg-zinc-700 active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-mono bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-[0.96] transition-[transform,background-color] flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    UPDATE USERNAME
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      maxLength={128}
                      className="w-full pl-4 pr-11 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] text-foreground"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-1 p-2 text-muted-foreground hover:text-foreground transition-[color,transform] active:scale-[0.96] rounded-md flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      maxLength={128}
                      className="w-full pl-4 pr-11 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] text-foreground"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 12 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-1 p-2 text-muted-foreground hover:text-foreground transition-[color,transform] active:scale-[0.96] rounded-md flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      maxLength={128}
                      className="w-full pl-4 pr-11 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow] text-foreground"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-1 p-2 text-muted-foreground hover:text-foreground transition-[color,transform] active:scale-[0.96] rounded-md flex items-center justify-center cursor-pointer min-w-[40px] min-h-[40px]"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordOpen(false)}
                    className="px-4 py-2 text-xs font-mono bg-zinc-800 text-muted-foreground rounded-lg hover:bg-zinc-700 active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-mono bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-[0.96] transition-[transform,background-color] flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    UPDATE PASSWORD
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
