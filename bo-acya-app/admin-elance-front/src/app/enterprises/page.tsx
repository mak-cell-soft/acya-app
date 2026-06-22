"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
}

export default function EnterprisesPage() {
  const router = useRouter();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedEnt, setSelectedEnt] = useState<Enterprise | null>(null);

  // Form states - Create
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("Trial");
  const [notes, setNotes] = useState("");
  
  // Form states - Provision
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [provisioningLoading, setProvisioningLoading] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
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
        localStorage.removeItem("token");
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

  const handleCreateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Automatically set schema name and default connection string
    const schemaName = `tenant_${slug.toLowerCase().trim().replace(/[^a-z0-9]/g, "_")}`;
    const defaultConnectionString = "Host=postgres;Port=5432;Database=wood-app-db;Username=postgres;Password=wood_app_strong_db_password_270326;";

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          slug: slug.toLowerCase().trim(),
          email: email || null,
          phone: phone || null,
          schemaName,
          connectionString: defaultConnectionString,
          plan,
          notes: notes || null
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create registry entry");
      }

      const created = await res.json();
      setShowCreateModal(false);
      
      // Clear forms
      setName("");
      setSlug("");
      setEmail("");
      setPhone("");
      setPlan("Trial");
      setNotes("");

      // Open provision modal automatically for this new enterprise
      setSelectedEnt(created);
      setAdminUsername("admin");
      setAdminEmail(created.email || `admin@${created.slug}.acya.site`);
      setAdminPassword("");
      setShowProvisionModal(true);

      fetchEnterprises();
    } catch (err: any) {
      setError(err.message || "Failed to create enterprise");
    }
  };

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnt) return;

    setError("");
    setProvisioningLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      
      // 1. Provision Db tables & seed admin user
      const provRes = await fetch(`${apiBase}admin/provisioning/provision/${selectedEnt.id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          adminUsername,
          adminEmail,
          adminPassword
        }),
      });

      if (!provRes.ok) {
        const txt = await provRes.text();
        throw new Error(txt || "Provisioning tables failed.");
      }

      // 2. Activate the tenant in Registry
      const actRes = await fetch(`${apiBase}admin/enterprise/${selectedEnt.id}/activate`, {
        method: "PUT",
        headers: getHeaders(),
      });

      if (!actRes.ok) {
        throw new Error("Tables provisioned but failed to set status to Active in registry.");
      }

      setShowProvisionModal(false);
      setSelectedEnt(null);
      fetchEnterprises();
    } catch (err: any) {
      setError(err.message || "Failed to provision tenant");
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Enterprises Registry</h1>
          <p className="text-muted-foreground mt-1">Manage tenant database schemas and domains.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
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
              {enterprises.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-mono">
                    NO ENTERPRISES REGISTERED
                  </td>
                </tr>
              ) : (
                enterprises.map((ent) => (
                  <tr key={ent.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-sm">{ent.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {ent.id.toString().padStart(4, '0')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://${ent.slug}.acya.site`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {ent.slug}.acya.site
                      </a>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                      {ent.schemaName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono">{ent.plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(ent)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:brightness-110 transition-all ${
                          ent.isActive 
                            ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${ent.isActive ? 'bg-primary' : 'bg-yellow-500'}`}></span>
                        {ent.isActive ? 'Active' : 'Pending'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      {!ent.isActive && (
                        <button 
                          onClick={() => {
                            setSelectedEnt(ent);
                            setAdminUsername("admin");
                            setAdminEmail(ent.email || `admin@${ent.slug}.acya.site`);
                            setAdminPassword("");
                            setShowProvisionModal(true);
                          }}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          Provision DB
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteTenant(ent.id, ent.name)}
                        className="text-xs font-medium text-destructive hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE ENTERPRISE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-border bg-card/90 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold font-mono text-foreground">REGISTER NEW TENANT</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEnterprise} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Enterprise Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wellness Medical"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Subdomain Slug</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-l-lg text-sm focus:outline-none focus:border-primary text-foreground font-mono"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. wellness-med"
                  />
                  <span className="px-3 py-2 bg-secondary border-t border-b border-r border-border/50 rounded-r-lg text-sm text-muted-foreground font-mono">
                    .acya.site
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Contact Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@wellness.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Contact Phone</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Plan Selection</label>
                <select
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                >
                  <option value="Trial">Trial (Default)</option>
                  <option value="Basic">Basic</option>
                  <option value="Premium">Premium</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Internal Notes</label>
                <textarea
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground h-16 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Billing terms, onboarding requirements..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm font-mono cursor-pointer"
              >
                REGISTER & OPEN PROVISIONING
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROVISION TENANT MODAL */}
      {showProvisionModal && selectedEnt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-border bg-card/90 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-mono text-foreground">PROVISION DATABASE</h2>
                <p className="text-xs text-muted-foreground font-mono mt-1">Tenant: {selectedEnt.name}</p>
              </div>
              <button 
                onClick={() => {
                  if (!provisioningLoading) {
                    setShowProvisionModal(false);
                    setSelectedEnt(null);
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-xl font-bold cursor-pointer"
                disabled={provisioningLoading}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProvisionTenant} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Admin Username</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground font-mono"
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
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={provisioningLoading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-muted-foreground">Admin Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Choose strong password"
                  disabled={provisioningLoading}
                />
              </div>

              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 space-y-1 text-xs text-muted-foreground font-mono">
                <div>Schema: <span className="text-foreground">{selectedEnt.schemaName}</span></div>
                <div>Domain: <span className="text-primary">{selectedEnt.slug}.acya.site</span></div>
              </div>

              <button
                type="submit"
                disabled={provisioningLoading}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm font-mono cursor-pointer flex items-center justify-center gap-2"
              >
                {provisioningLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                    PROVISIONING TABLES (3-10 SECS)...
                  </>
                ) : (
                  "DUPLICATE TABLES & RUN MIGRATIONS"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
