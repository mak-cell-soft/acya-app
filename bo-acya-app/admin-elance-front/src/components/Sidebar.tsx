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
  Settings 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem("sidebar_collapsed", String(nextVal));
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
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
          onClick={() => setIsPasswordOpen(true)}
          className={`flex items-center rounded-lg hover:bg-secondary transition-colors cursor-pointer group ${isCollapsed ? 'justify-center p-1.5' : 'gap-3 px-3 py-2 w-full text-left'}`}
          title={isCollapsed ? "SA Credentials" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-mono text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">SA</div>
          {(!isCollapsed || !mounted) && (
            <>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">Super Admin</span>
                <span className="text-xs text-muted-foreground mt-1 font-mono">SYS_ROOT</span>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </>
          )}
        </button>
      </div>

      {isPasswordOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
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
                  SECURE PASSWORD CORE
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">Modify the system operator credentials</p>
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

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground font-medium">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-850 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                  value={confirmPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  className="px-4 py-2 text-xs font-mono bg-zinc-800 text-muted-foreground rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-mono bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  COMMIT_CHANGE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
