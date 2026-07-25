"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, ToggleLeft, Trash2, CheckCircle2, Loader2, ExternalLink, Edit, Users, Lock, ChevronLeft, ChevronRight, FileText } from "lucide-react";

interface TenantAppUser {
  id: number;
  login: string | null;
  email: string | null;
  isActive: boolean;
  fullName: string | null;
  role: string | null;
  phoneNumber: string | null;
  createdAt: string | null;
}


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
  secondaryColor?: string | null;
  customDomain?: string | null;
  language?: string | null;
  currency?: string | null;
  isSalingWood?: boolean;
  isManagingConstructions?: boolean;
  planPrice?: number;
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
  const [isEditingActive, setIsEditingActive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Deactivated'>('All');

  // Users list slide-over panel state
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantAppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize] = useState(5); // 5 users per page for compact layout
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Password reset sub-modal state
  const [resetUser, setResetUser] = useState<TenantAppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSubmitLoading, setResetSubmitLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteSubmitLoading, setDeleteSubmitLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");


  // Form states - Create & Provision Unified
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("Trial");
  const [notes, setNotes] = useState("");
  const [isSalingWood, setIsSalingWood] = useState(false);
  const [isManagingConstructions, setIsManagingConstructions] = useState(false);
  
  // Branding Customization (Optional)
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [secondaryColor, setSecondaryColor] = useState("#EBF1FA");
  const [customDomain, setCustomDomain] = useState("");
  const [language, setLanguage] = useState("fr");
  const [currency, setCurrency] = useState("TND");
  const [planPrice, setPlanPrice] = useState<number>(0);

  // Extended Registration Data
  const [description, setDescription] = useState("");
  const [mobileOne, setMobileOne] = useState("");
  const [mobileTwo, setMobileTwo] = useState("");
  const [matriculeFiscal, setMatriculeFiscal] = useState("");
  const [devise, setDevise] = useState("TND");
  const [siegeAddress, setSiegeAddress] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [capital, setCapital] = useState("");
  const [nameResponsable, setNameResponsable] = useState("");
  const [surnameResponsable, setSurnameResponsable] = useState("");
  const [positionResponsable, setPositionResponsable] = useState("");
  const [adminSurname, setAdminSurname] = useState("");
  const [sites, setSites] = useState<any[]>([]);

  // Admin Credentials
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const clearForm = () => {
    setExistingId(null);
    setIsEditingActive(false);
    setName("");
    setSlug("");
    setEmail("");
    setPhone("");
    setPlan("Trial");
    setPlanPrice(0);
    setNotes("");
    setIsSalingWood(false);
    setIsManagingConstructions(false);
    setLogoUrl("");
    setFaviconUrl("");
    setPrimaryColor("#3B82F6");
    setSecondaryColor("#EBF1FA");
    setCustomDomain("");
    setLanguage("fr");
    setCurrency("TND");
    setAdminUsername("admin");
    setAdminEmail("");
    setAdminPassword("");

    setDescription("");
    setMobileOne("");
    setMobileTwo("");
    setMatriculeFiscal("");
    setDevise("TND");
    setSiegeAddress("");
    setCommercialRegister("");
    setCapital("");
    setNameResponsable("");
    setSurnameResponsable("");
    setPositionResponsable("");
    setAdminSurname("");
    setSites([]);
  };

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
      name,
      slug: slug.toLowerCase().trim() || null,
      email: email || null,
      phone: phone || null,
      plan,
      planPrice,
      notes: notes || null,
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      customDomain: customDomain || null,
      language,
      currency,
      isSalingWood,
      isManagingConstructions,
      adminUsername,
      adminEmail: adminEmail || email || `admin@${slug || "tenant"}.acya.site`,
      adminPassword: adminPassword || "AdminPass123!",
      description: description || null,
      mobileOne: mobileOne || null,
      mobileTwo: mobileTwo || null,
      matriculeFiscal: matriculeFiscal || null,
      devise: devise || null,
      siegeAddress: siegeAddress || null,
      commercialRegister: commercialRegister || null,
      capital: capital || null,
      nameResponsable: nameResponsable || null,
      surnameResponsable: surnameResponsable || null,
      positionResponsable: positionResponsable || null,
      adminSurname: adminSurname || null,
      sites: sites && sites.length > 0 ? sites : null,
    };

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      let res;
      if (isEditingActive && existingId) {
        res = await fetch(`${apiBase}admin/enterprise/${existingId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${apiBase}admin/enterprise`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ ...payload, existingId }),
        });
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save enterprise settings.");
      }

      if (isEditingActive) {
        setShowCreateModal(false);
        clearForm();
        fetchEnterprises();
      } else {
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

        clearForm();
        fetchEnterprises();
      }
    } catch (err: any) {
      setError(err.message || "Operation failed.");
    } finally {
      setProvisioningLoading(false);
    }
  };

  const handleOpenEditActive = (ent: Enterprise) => {
    setCreationSuccessData(null);
    setExistingId(ent.id);
    setIsEditingActive(true);
    setName(ent.name);
    setSlug(ent.slug);
    setEmail(ent.email || "");
    setPhone(ent.phone || "");
    setPlan(ent.plan || "Trial");
    setPlanPrice(ent.planPrice || 0);
    setNotes(ent.notes || "");
    setLogoUrl(ent.logoUrl || "");
    setFaviconUrl(ent.faviconUrl || "");
    setPrimaryColor(ent.primaryColor || "#3B82F6");
    setSecondaryColor(ent.secondaryColor || "#EBF1FA");
    setCustomDomain(ent.customDomain || "");
    setLanguage(ent.language || "fr");
    setCurrency(ent.currency || "TND");
    setIsSalingWood(ent.isSalingWood || false);
    setIsManagingConstructions(ent.isManagingConstructions || false);
    setShowCreateModal(true);
  };

  const handleOpenDelete = (ent: Enterprise) => {
    setDeleteTarget({ id: ent.id, name: ent.name });
    setDeleteError("");
  };

  const handleDeleteTenantSubmit = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitLoading(true);
    setDeleteError("");
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to delete tenant schema/registry");
      }

      setDeleteTarget(null);
      fetchEnterprises();
    } catch (err: any) {
      setDeleteError(err.message || "Deletion failed");
    } finally {
      setDeleteSubmitLoading(false);
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
    setIsEditingActive(false);
    setName(ent.name);
    setSlug(ent.slug);
    setEmail(ent.email || "");
    setPhone(ent.phone || "");
    setPlan(ent.plan || "Trial");
    setPlanPrice(ent.planPrice || 0);
    setNotes(ent.notes || "");
    setLogoUrl(ent.logoUrl || "");
    setFaviconUrl(ent.faviconUrl || "");
    setPrimaryColor(ent.primaryColor || "#3B82F6");
    setSecondaryColor(ent.secondaryColor || "#EBF1FA");
    setCustomDomain(ent.customDomain || "");
    setLanguage(ent.language || "fr");
    setCurrency(ent.currency || "TND");

    // Pre-fill fields from notes JSON blob
    if (ent.notes) {
      try {
        const payload = JSON.parse(ent.notes);
        setIsSalingWood(payload.issalingwood ?? payload.isSalingWood ?? false);
        setIsManagingConstructions(payload.ismanagingconstructions ?? payload.isManagingConstructions ?? false);
        
        setDescription(payload.description || "");
        setMobileOne(payload.mobileOne || "");
        setMobileTwo(payload.mobileTwo || "");
        setMatriculeFiscal(payload.matriculeFiscal || "");
        setDevise(payload.devise || "TND");
        setSiegeAddress(payload.siegeAddress || "");
        setCommercialRegister(payload.commercialregister || payload.commercialRegister || "");
        setCapital(payload.capital || "");
        setNameResponsable(payload.nameResponsable || "");
        setSurnameResponsable(payload.surnameResponsable || "");
        setPositionResponsable(payload.positionResponsable || "");
        setSites(payload.sites || []);

        if (payload.user) {
          setAdminUsername(payload.user.name || "admin");
          setAdminSurname(payload.user.surname || "");
          setAdminEmail(payload.user.email || payload.email || ent.email || "");
          setAdminPassword(payload.user.password || "");
        } else {
          setAdminUsername("admin");
          setAdminSurname("");
          setAdminEmail(ent.email || "");
          setAdminPassword("");
        }
      } catch (e) {
        setIsSalingWood(false);
        setIsManagingConstructions(false);
        setDescription("");
        setMobileOne("");
        setMobileTwo("");
        setMatriculeFiscal("");
        setDevise("TND");
        setSiegeAddress("");
        setCommercialRegister("");
        setCapital("");
        setNameResponsable("");
        setSurnameResponsable("");
        setPositionResponsable("");
        setAdminSurname("");
        setSites([]);
        setAdminUsername("admin");
        setAdminEmail(ent.email || "");
        setAdminPassword("");
      }
    } else {
      setIsSalingWood(false);
      setIsManagingConstructions(false);
      setDescription("");
      setMobileOne("");
      setMobileTwo("");
      setMatriculeFiscal("");
      setDevise("TND");
      setSiegeAddress("");
      setCommercialRegister("");
      setCapital("");
      setNameResponsable("");
      setSurnameResponsable("");
      setPositionResponsable("");
      setAdminSurname("");
      setSites([]);
      setAdminUsername("admin");
      setAdminEmail(ent.email || "");
      setAdminPassword("");
    }

    setShowCreateModal(true);
  };

  const handlePlanChange = (selectedPlan: string) => {
    setPlan(selectedPlan);
    if (selectedPlan === "Starter") {
      setPlanPrice(90);
    } else if (selectedPlan === "Pro") {
      setPlanPrice(99);
    } else if (selectedPlan === "Trial") {
      setPlanPrice(0);
    } else if (selectedPlan === "Enterprise") {
      setPlanPrice(299);
    }
  };

  const fetchTenantUsers = async (ent: Enterprise, pageNum: number) => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${ent.id}/users?page=${pageNum}&pageSize=${usersPageSize}`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch tenant users.");
      }

      const data = await res.json();
      setTenantUsers(data.users || []);
      setTotalUsersCount(data.totalCount || 0);
    } catch (err: any) {
      setUsersError(err.message || "An error occurred fetching tenant users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleOpenUsers = (ent: Enterprise) => {
    setSelectedEnterprise(ent);
    setTenantUsers([]);
    setTotalUsersCount(0);
    setUsersPage(1);
    setUsersError("");
    setShowUsersPanel(true);
    fetchTenantUsers(ent, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (!selectedEnterprise) return;
    setUsersPage(newPage);
    fetchTenantUsers(selectedEnterprise, newPage);
  };

  const handleInitiatePasswordReset = (user: TenantAppUser) => {
    setResetUser(user);
    setNewPassword("");
    setResetSuccessMsg("");
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnterprise || !resetUser || !newPassword) return;
    setResetSubmitLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/enterprise/${selectedEnterprise.id}/users/${resetUser.id}/reset-password`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to reset password.");
      }

      setResetSuccessMsg("Password reset successfully!");
    } catch (err: any) {
      alert(err.message || "Reset failed.");
    } finally {
      setResetSubmitLoading(false);
    }
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
            setExistingId(null);
            setIsEditingActive(false);
            setName("");
            setSlug("");
            setEmail("");
            setPhone("");
            setPlan("Trial");
            setPlanPrice(0);
            setNotes("");
            setIsSalingWood(false);
            setIsManagingConstructions(false);
            setLogoUrl("");
            setFaviconUrl("");
            setPrimaryColor("#3B82F6");
            setCustomDomain("");
            setLanguage("fr");
            setCurrency("TND");
            setAdminUsername("admin");
            setAdminEmail("");
            setAdminPassword("");
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
                        <div className="text-sm font-mono">{ent.plan}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {ent.plan === "Trial" ? "Free" : `${ent.planPrice || 0} ${ent.currency || "TND"}/mo`}
                        </div>
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
                          <>
                            {ent.isActive && (
                              <>
                                <button 
                                  onClick={() => handleImpersonate(ent)}
                                  className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Key className="w-3 h-3" />
                                  Impersonate
                                </button>
                                <button 
                                  onClick={() => handleOpenUsers(ent)}
                                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  Users
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleOpenEditActive(ent)}
                              className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleOpenDelete(ent)}
                          className="text-xs font-medium text-destructive hover:underline cursor-pointer inline-flex items-center gap-1"
                          title="Delete Tenant"
                        >
                          <Trash2 className="w-3 h-3" />
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
                {isEditingActive 
                  ? "EDIT ENTERPRISE CONFIGURATION" 
                  : existingId 
                    ? "CONFIRM & PROVISION PENDING REGISTRATION" 
                    : "REGISTER & AUTOMATICALLY PROVISION TENANT"}
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

                  <div className="grid grid-cols-4 gap-4">
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
                        onChange={(e) => handlePlanChange(e.target.value)}
                        disabled={provisioningLoading}
                      >
                        <option value="Trial">Trial (30 Days)</option>
                        <option value="Starter">Starter (5 Users)</option>
                        <option value="Pro">Pro (25 Users)</option>
                        <option value="Enterprise">Enterprise (Unlimited)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Monthly Price ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-primary text-slate-100 font-mono"
                        value={planPrice}
                        onChange={(e) => setPlanPrice(Number(e.target.value))}
                        disabled={provisioningLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 1.5: Preserved Registration Details Display */}
                {(matriculeFiscal || siegeAddress || nameResponsable || (sites && sites.length > 0)) && (
                  <div className="p-4 bg-slate-950/80 border border-amber-500/20 rounded-xl space-y-3 shadow-inner">
                    <h4 className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      Données d'Inscription Enregistrées (Conservées à la Validation)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {matriculeFiscal && (
                        <div>
                          <span className="text-slate-400 font-mono">Matricule Fiscal: </span>
                          <span className="font-mono text-slate-200 font-bold">{matriculeFiscal}</span>
                        </div>
                      )}
                      {siegeAddress && (
                        <div>
                          <span className="text-slate-400">Adresse Siège: </span>
                          <span className="text-slate-200">{siegeAddress}</span>
                        </div>
                      )}
                      {devise && (
                        <div>
                          <span className="text-slate-400">Devise: </span>
                          <span className="font-mono text-slate-200">{devise}</span>
                        </div>
                      )}
                      {commercialRegister && (
                        <div>
                          <span className="text-slate-400">Registre Commerce: </span>
                          <span className="font-mono text-slate-200">{commercialRegister}</span>
                        </div>
                      )}
                      {capital && (
                        <div>
                          <span className="text-slate-400">Capital: </span>
                          <span className="font-mono text-slate-200">{capital}</span>
                        </div>
                      )}
                      {(nameResponsable || surnameResponsable) && (
                        <div>
                          <span className="text-slate-400">Responsable Légale: </span>
                          <span className="text-slate-200 font-medium">{surnameResponsable} {nameResponsable} {positionResponsable ? `(${positionResponsable})` : ''}</span>
                        </div>
                      )}
                    </div>
                    {sites && sites.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 text-xs">
                        <span className="text-slate-400 font-mono">Sites de Vente Enregistrés ({sites.length}): </span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {sites.map((s: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                              {s.gov ? `${s.gov} - ` : ''}{s.address}{s.isForSale ? ' (Point de Vente)' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Admin Credentials */}
                {!isEditingActive && (
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
                )}

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
                    <div className="space-y-1">
                      <label className="text-xs font-mono uppercase text-muted-foreground">Secondary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-9 w-10 p-0.5 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          disabled={provisioningLoading}
                        />
                        <input
                          type="text"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs focus:outline-none focus:border-primary text-slate-100 font-mono"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          disabled={provisioningLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 col-span-1">
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
                        <select
                          className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          disabled={provisioningLoading}
                        >
                          <option value="TND">TND</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      id="isSalingWood"
                      className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-primary focus:ring-primary focus:ring-opacity-50 cursor-pointer"
                      checked={isSalingWood}
                      onChange={(e) => setIsSalingWood(e.target.checked)}
                      disabled={provisioningLoading}
                    />
                    <label htmlFor="isSalingWood" className="text-sm font-medium text-slate-200 cursor-pointer select-none">
                      Activer le traitement spécial bois (Seed Natural Wood tables)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      id="isManagingConstructions"
                      className="w-4 h-4 bg-slate-950 border border-slate-800 rounded text-primary focus:ring-primary focus:ring-opacity-50 cursor-pointer"
                      checked={isManagingConstructions}
                      onChange={(e) => setIsManagingConstructions(e.target.checked)}
                      disabled={provisioningLoading}
                    />
                    <label htmlFor="isManagingConstructions" className="text-sm font-medium text-slate-200 cursor-pointer select-none">
                      Activer la gestion des chantiers (Module Chantiers)
                    </label>
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
                      {isEditingActive ? "SAVING CHANGES..." : "NON-INTERACTIVE PROVISIONING IN PROGRESS (3-10 SECONDS)..."}
                    </>
                  ) : (
                    isEditingActive ? "SAVE SETTINGS" : "PROVISION REGISTRY ENTRY & SCHEMAS"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CONNECTED TENANT USERS SLIDE-OVER DRAWER */}
      {showUsersPanel && selectedEnterprise && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Drawer backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowUsersPanel(false)}
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-secondary/10">
                <div>
                  <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
                    <Users className="text-indigo-400 w-5 h-5" />
                    {selectedEnterprise.name.toUpperCase()} - USER ACCOUNTS
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-1">Schema: {selectedEnterprise.schemaName}</p>
                </div>
                <button 
                  onClick={() => setShowUsersPanel(false)}
                  className="text-muted-foreground hover:text-foreground text-2xl font-semibold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {usersError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-sm">
                    {usersError}
                  </div>
                )}

                {usersLoading ? (
                  <div className="p-12 text-center text-muted-foreground font-mono flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span>FETCHING TENANT USER RECORDS...</span>
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <div className="text-center p-12 text-muted-foreground font-mono border border-dashed border-slate-800 rounded-xl">
                    NO USER ACCOUNTS FOUND FOR THIS TENANT
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                      <span>SHOWING {tenantUsers.length} OF {totalUsersCount} REGISTERED USERS</span>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/50">
                            <th className="px-4 py-3 text-xs font-mono text-muted-foreground font-medium uppercase">User Details</th>
                            <th className="px-4 py-3 text-xs font-mono text-muted-foreground font-medium uppercase">Role</th>
                            <th className="px-4 py-3 text-xs font-mono text-muted-foreground font-medium uppercase">Status</th>
                            <th className="px-4 py-3 text-xs font-mono text-muted-foreground font-medium uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {tenantUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-900/40 transition-colors text-sm">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-100">{user.fullName || "N/A"}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-0.5">Login: {user.login}</div>
                                {user.email && <div className="text-xs text-muted-foreground/80 mt-0.5">{user.email}</div>}
                                {user.phoneNumber && <div className="text-xs text-muted-foreground/60 mt-0.5">📞 {user.phoneNumber}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  user.isActive 
                                    ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                    : 'bg-destructive/10 text-destructive border-destructive/20'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-primary' : 'bg-destructive'}`}></span>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleInitiatePasswordReset(user)}
                                  className="text-xs font-semibold text-amber-500 hover:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Lock className="w-3 h-3" />
                                  Reset Pass
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => handlePageChange(usersPage - 1)}
                        disabled={usersPage <= 1}
                        className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-850 text-xs font-semibold font-mono text-slate-200 border border-slate-800 rounded transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        PREV
                      </button>
                      <span className="text-xs font-mono text-muted-foreground">
                        PAGE {usersPage} OF {Math.ceil(totalUsersCount / usersPageSize) || 1}
                      </span>
                      <button
                        onClick={() => handlePageChange(usersPage + 1)}
                        disabled={usersPage * usersPageSize >= totalUsersCount}
                        className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-850 text-xs font-semibold font-mono text-slate-200 border border-slate-800 rounded transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        NEXT
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-md font-bold font-mono text-slate-100 flex items-center gap-2">
                <Lock className="text-amber-500 w-4 h-4" />
                RESET PASSWORD: {resetUser.login}
              </h3>
              <button 
                onClick={() => {
                  if (!resetSubmitLoading) {
                    setResetUser(null);
                    setNewPassword("");
                    setResetSuccessMsg("");
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-xl font-bold cursor-pointer"
                disabled={resetSubmitLoading}
              >
                &times;
              </button>
            </div>

            {resetSuccessMsg ? (
              <div className="space-y-4 py-4 text-center">
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-lg font-mono text-sm">
                  {resetSuccessMsg}
                </div>
                <button
                  onClick={() => {
                    setResetUser(null);
                    setNewPassword("");
                    setResetSuccessMsg("");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-mono rounded"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-muted-foreground">New Password</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-100"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={resetSubmitLoading}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-mono text-slate-300 rounded cursor-pointer"
                    disabled={resetSubmitLoading}
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-xs font-mono text-white rounded cursor-pointer flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    disabled={resetSubmitLoading}
                  >
                    {resetSubmitLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "RESET NOW"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-md font-bold font-mono text-destructive flex items-center gap-2">
                <Trash2 className="text-destructive w-4 h-4" />
                DELETE TENANT: {deleteTarget.name}
              </h3>
              <button 
                onClick={() => {
                  if (!deleteSubmitLoading) {
                    setDeleteTarget(null);
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-xl font-bold cursor-pointer"
                disabled={deleteSubmitLoading}
              >
                &times;
              </button>
            </div>

            {deleteError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-mono text-xs">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs leading-relaxed font-mono">
                <span className="font-bold text-red-500">WARNING:</span> Are you absolutely sure you want to completely delete <span className="font-bold text-slate-100">"{deleteTarget.name}"</span>?
                <br /><br />
                This will drop all database tables, wipe all records, and delete the tenant from registry forever. This action is irreversible.
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs font-mono text-slate-300 rounded cursor-pointer"
                disabled={deleteSubmitLoading}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleDeleteTenantSubmit}
                className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-xs font-mono text-white rounded cursor-pointer flex items-center gap-1 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                disabled={deleteSubmitLoading}
              >
                {deleteSubmitLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "DELETE FOREVER"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
