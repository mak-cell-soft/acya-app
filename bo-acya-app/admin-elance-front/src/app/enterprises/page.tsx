"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, ToggleLeft, Trash2, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

interface Enterprise {
  id: number;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  schemaName: string;
  connectionString: string;
  isActive: boolean;
  plan: string;
  status: string;
  createdAt: string;
  activatedAt: string | null;
  notes: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
  language?: string | null;
  currency?: string | null;
}

export default function EnterprisesPage() {
  const router = useRouter();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [provisioningLoading, setProvisioningLoading] = useState(false);
  const [creationSuccessData, setCreationSuccessData] = useState<any | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Deactivated'>('All');

  // Form states - Create & Provision Unified
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("Trial");
  const [notes, setNotes] = useState("");
  
  // Branding Customization (Optional)
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [customDomain, setCustomDomain] = useState("");
  const [language, setLanguage] = useState("fr");
  const [currency, setCurrency] = useState("EUR");

  // Admin Credentials
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  };

  const fetchEnterprises = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise`, {
        headers: getHeaders(),
      });

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem("token");
        }
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch enterprises registry.");
      }

      const data = await res.json();
      setEnterprises(data);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching enterprises");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterprises();
  }, []);

  const handleCreateAndProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProvisioningLoading(true);

    const payload = {
      existingId,
      name,
      slug: slug.toLowerCase().trim() || null,
      email: email || null,
      phone: phone || null,
      plan,
      notes: notes || null,
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
      primaryColor: primaryColor || null,
      customDomain: customDomain || null,
      language,
      currency,
      adminUsername,
      adminEmail: adminEmail || email || `admin@${slug || "tenant"}.acya.site`,
      adminPassword: adminPassword || "AdminPass123!"
    };

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create & provision tenant.");
      }

      const createdResponse = await res.json();
      
      // Store credentials generated to display in a success state
      setCreationSuccessData({
        name: payload.name,
        slug: createdResponse.slug || payload.slug,
        adminUsername,
        adminEmail: payload.adminEmail,
        adminPassword: payload.adminPassword,
        url: `https://${createdResponse.slug || payload.slug}.acya.site`
      });

      // Clear forms
      setExistingId(null);
      setName("");
      setSlug("");
      setEmail("");
      setPhone("");
      setPlan("Trial");
      setNotes("");
      setLogoUrl("");
      setFaviconUrl("");
      setPrimaryColor("#3B82F6");
      setCustomDomain("");
      setLanguage("fr");
      setCurrency("EUR");
      setAdminUsername("admin");
      setAdminEmail("");
      setAdminPassword("");

      fetchEnterprises();
    } catch (err: any) {
      setError(err.message || "Failed to create & provision tenant.");
    } finally {
      setProvisioningLoading(false);
    }
  };

  const handleDeleteTenant = async (id: number, name: string) => {
    const confirmDelete = window.confirm(
      `WARNING: Are you absolutely sure you want to completely DELETE "${name}"?\n\nThis will drop all database tables, wipe all records, and delete the tenant from registry forever.`
    );
    if (!confirmDelete) return;

    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to delete tenant schema/registry");
      }

      fetchEnterprises();
    } catch (err: any) {
      setError(err.message || "Deletion failed");
    }
  };

  const handleToggleStatus = async (ent: Enterprise) => {
    setError("");
    const newStatus = ent.isActive ? "suspend" : "activate";
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${ent.id}/${newStatus}`, {
        method: "PUT",
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to change status to ${newStatus}`);
      }

      fetchEnterprises();
    } catch (err: any) {
      setError(err.message || "Failed to update tenant status");
    }
  };

  const handleImpersonate = async (ent: Enterprise) => {
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${ent.id}/impersonate`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to generate impersonation token.");
      }

      const data = await res.json();
      const token = data.token;
      
      // Open client portal in a new window with token in search query
      const targetUrl = `https://${ent.slug}.acya.site/login?token=${token}`;
      window.open(targetUrl, '_blank');
    } catch (err: any) {
      setError(err.message || "Failed to impersonate tenant admin user.");
    }
  };

  const handleOpenProvisionPending = (ent: Enterprise) => {
    setCreationSuccessData(null);
    setExistingId(ent.id);
    setName(ent.name);
    setSlug(ent.slug);
    setEmail(ent.email || "");
    setPhone(ent.phone || "");
    setPlan(ent.plan || "Trial");
    setNotes(ent.notes || "");
    setLogoUrl(ent.logoUrl || "");
    setFaviconUrl(ent.faviconUrl || "");
    setPrimaryColor(ent.primaryColor || "#3B82F6");
    setCustomDomain(ent.customDomain || "");
    setLanguage(ent.language || "fr");
    setCurrency(ent.currency || "EUR");

    // Pre-fill Admin credentials from notes JSON
    if (ent.notes) {
      try {
        const payload = JSON.parse(ent.notes);
        if (payload.user) {
          setAdminUsername(payload.user.name || "admin");
          setAdminEmail(payload.user.email || payload.email || "");
          setAdminPassword(payload.user.password || "");
        } else {
          setAdminUsername("admin");
          setAdminEmail(ent.email || "");
          setAdminPassword("");
        }
      } catch (e) {
        setAdminUsername("admin");
        setAdminEmail(ent.email || "");
        setAdminPassword("");
      }
    } else {
      setAdminUsername("admin");
      setAdminEmail(ent.email || "");
      setAdminPassword("");
    }

    setShowCreateModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Enterprises Registry</h1>
          <p className="text-muted-foreground mt-1">Manage tenant database schemas and custom domains.</p>
        </div>
        <button 
          onClick={() => {
            setCreationSuccessData(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer"
        >
          Register & Provision Tenant
        </button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel p-12 text-center text-muted-foreground font-mono">
          FETCHING ENTERPRISE REGISTRY DATA...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-border/20 pb-1">
            {(['All', 'Active', 'Pending', 'Deactivated'] as const).map((filter) => {
              const count = enterprises.filter(ent => {
                if (filter === 'All') return true;
                if (filter === 'Pending') return ent.status === 'Pending';
                if (filter === 'Active') return ent.isActive && ent.status !== 'Pending';
                if (filter === 'Deactivated') return !ent.isActive && ent.status !== 'Pending';
              }).length;

              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 text-xs font-mono font-medium rounded-t-lg border-t border-x transition-all cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-secondary/40 border-border text-white'
                      : 'bg-transparent border-transparent text-muted-foreground hover:text-white'
                  }`}
                >
                  {filter.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>

          <div className="glass-panel rounded-xl overflow-hidden bg-card/25 border border-border/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Enterprise Name</th>
                  <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">URL / Slug</th>
                  <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">DB Schema</th>
                  <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {enterprises.filter(ent => {
                  if (statusFilter === 'All') return true;
                  if (statusFilter === 'Pending') return ent.status === 'Pending';
                  if (statusFilter === 'Active') return ent.isActive && ent.status !== 'Pending';
                  if (statusFilter === 'Deactivated') return !ent.isActive && ent.status !== 'Pending';
                  return true;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-mono">
                      NO ENTERPRISES FOUND IN THIS CATEGORY
                    </td>
                  </tr>
                ) : (
                  enterprises.filter(ent => {
                    if (statusFilter === 'All') return true;
                    if (statusFilter === 'Pending') return ent.status === 'Pending';
                    if (statusFilter === 'Active') return ent.isActive && ent.status !== 'Pending';
                    if (statusFilter === 'Deactivated') return !ent.isActive && ent.status !== 'Pending';
                    return true;
                  }).map((ent) => (
                    <tr key={ent.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-100">{ent.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {ent.id.toString().padStart(4, '0')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={`https://${ent.slug}.acya.site`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="font-mono text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {ent.slug}.acya.site
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                        {ent.schemaName}
                      </td>
                      <td className="px-6 py-4 text-slate-200">
                        <span className="text-sm font-mono">{ent.plan}</span>
                      </td>
                      <td className="px-6 py-4">
                        {ent.status === 'Pending' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            <span className="w-1.5 h-1.5 rounded-full mr-2 bg-amber-500 animate-pulse"></span>
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(ent)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:brightness-110 transition-all ${
                              ent.isActive 
                                ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}
                            title={ent.isActive ? "Click to Deactivate" : "Click to Activate"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${ent.isActive ? 'bg-primary' : 'bg-destructive'}`}></span>
                            {ent.isActive ? 'Active' : 'Deactivated'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        {ent.status === 'Pending' ? (
                          <button 
                            onClick={() => handleOpenProvisionPending(ent)}
                            className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm & Provision
                          </button>
                        ) : (
                          ent.isActive && (
                            <button 
                              onClick={() => handleImpersonate(ent)}
                              className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Key className="w-3 h-3" />
                              Impersonate
                            </button>
                          )
                        )}
                        <button 
                          onClick={() => handleDeleteTenant(ent.id, ent.name)}
                          className="text-xs font-medium text-destructive hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UNIFIED CREATE & PROVISION TENANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
                <Shield className="text-primary w-6 h-6" />
                {existingId ? "CONFIRM & PROVISION PENDING REGISTRATION" : "REGISTER & AUTOMATICALLY PROVISION TENANT"}
              </h2>
              <button 
                onClick={() => {
                  if (!provisioningLoading) {
                    setShowCreateModal(false);
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-xl font-bold cursor-pointer"
                disabled={provisioningLoading}
              >
                &times;
              </button>
            </div>

            {creationSuccessData ? (
              <div className="space-y-6 text-center py-6 animate-in zoom-in duration-500">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-100">Provisionnement Réussi !</h3>
                  <p className="text-sm text-muted-foreground">
                    Le locataire <b>{creationSuccessData.name}</b> a été créé et sa base de données a été migrée avec succès.
                  </p>
                </div>
                
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl text-left font-mono text-xs space-y-2.5 max-w-md mx-auto">
                  <div><span className="text-muted-foreground">URL :</span> <a href={creationSuccessData.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{creationSuccessData.url}</a></div>
                  <div><span className="text-muted-foreground">Identifiant Admin :</span> <span className="text-slate-200">{creationSuccessData.adminUsername}</span></div>
                  <div><span className="text-muted-foreground">Email Admin :</span> <span className="text-slate-200">{creationSuccessData.adminEmail}</span></div>
                  <div><span className="text-muted-foreground">Mot de passe :</span> <span className="text-slate-200">{creationSuccessData.adminPassword}</span></div>
                </div>

                <div className="pt-4 flex justify-center">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Fermer le Panel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAndProvision} className="space-y-6">
                
                {/* Section 1: Tenant Information */}
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-mono tracking-wider text-primary border-b border-slate-800/60 pb-1.5">1. Informations Locataire</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Enterprise Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. wellness medical"
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Subdomain Slug (Opt)</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100 font-mono"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="e.g. wellness-med (leaves empty for auto)"
                        disabled={provisioningLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@wellness.com"
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Phone</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+33 6 12 34 56"
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Plan Selection</label>
                      <select
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        disabled={provisioningLoading}
                      >
                        <option value="Trial">Trial (30 Days)</option>
                        <option value="Starter">Starter (5 Users)</option>
                        <option value="Pro">Pro (25 Users)</option>
                        <option value="Enterprise">Enterprise (Unlimited)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Admin Credentials */}
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-mono tracking-wider text-primary border-b border-slate-800/60 pb-1.5">2. Identifiants Administrateur du Tenant</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Admin Username</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100 font-mono"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Admin Email</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@wellness.com"
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Admin Password (Opt)</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100 font-mono"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Auto-generated if empty"
                        disabled={provisioningLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Branding & Options (Optional) */}
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-mono tracking-wider text-primary border-b border-slate-800/60 pb-1.5">3. Personnalisation & Options (Optionnel)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Logo URL</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://mon-serveur.com/logo.png"
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Favicon URL</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={faviconUrl}
                        onChange={(e) => setFaviconUrl(e.target.value)}
                        placeholder="https://mon-serveur.com/favicon.ico"
                        disabled={provisioningLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Primary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-9 w-10 p-0.5 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          disabled={provisioningLoading}
                        />
                        <input
                          type="text"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs focus:outline-none focus:border-primary text-slate-100 font-mono"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          disabled={provisioningLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Custom Domain</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="erp.monentreprise.com"
                        disabled={provisioningLoading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Langue / Devise</label>
                      <div className="flex gap-1">
                        <select
                          className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          disabled={provisioningLoading}
                        >
                          <option value="fr">FR</option>
                          <option value="en">EN</option>
                          <option value="ar">AR</option>
                        </select>
                        <input
                          type="text"
                          className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono text-center"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          placeholder="EUR"
                          disabled={provisioningLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono uppercase text-muted-foreground">Internal Notes</label>
                    <textarea
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100 h-14 resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special client notes, contract terms etc."
                      disabled={provisioningLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={provisioningLoading}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm font-mono cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  {provisioningLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      NON-INTERACTIVE PROVISIONING IN PROGRESS (3-10 SECONDS)...
                    </>
                  ) : (
                    "PROVISION REGISTRY ENTRY & SCHEMAS"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
