"use client";

import { useEffect, useState } from "react";
import { FileText, Save, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState("Checking...");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [isRneRequired, setIsRneRequired] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApiEndpoint(process.env.NEXT_PUBLIC_API_URL || window.location.origin + "/api/");
    }, 0);

    const loadSettingsAndStatus = async () => {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const headers = { "Authorization": `Bearer ${token}` };

      try {
        const metricsRes = await fetch(`${apiBase}admin/dashboard/metrics`, { headers });
        if (metricsRes.ok) {
          setDbStatus("Connected (Master Registry OK)");
        } else {
          setDbStatus("Error connecting to Master API");
        }
      } catch {
        setDbStatus("Offline");
      }

      try {
        const settingsRes = await fetch(`${apiBase}admin/settings`, { headers });
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (typeof data.isRneRequired === "boolean") {
            setIsRneRequired(data.isRneRequired);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettingsAndStatus();
    return () => clearTimeout(timer);
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/";
      const res = await fetch(`${apiBase}admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isRneRequired })
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour des paramètres.");
      }

      const data = await res.json();
      setIsRneRequired(data.isRneRequired);
      setFeedbackMsg({
        type: "success",
        text: `Paramètres enregistrés avec succès ! L'import RNE est maintenant ${data.isRneRequired ? "OBLIGATOIRE" : "NON OBLIGATOIRE"}.`
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Impossible de sauvegarder la configuration."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global platform constants, legal compliance, and system parameters.</p>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl font-mono text-sm border flex items-center gap-3 transition-all ${
          feedbackMsg.type === "success" 
            ? "bg-primary/10 border-primary/30 text-primary" 
            : "bg-destructive/10 border-destructive/30 text-destructive"
        }`}>
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* RNE & Registration Configuration */}
      <div className="glass-panel p-8 rounded-xl bg-card/25 border border-border/50 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-mono tracking-tight text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                REGISTRATION & COMPLIANCE (RNE DOCUMENT)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                Spécifiez si l&apos;importation du document PDF RNE est obligatoire lors de l&apos;inscription sur acya.site
              </p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-mono font-semibold border ${
            isRneRequired 
              ? "bg-primary/10 border-primary/30 text-primary" 
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            {isRneRequired ? "OBLIGATOIRE" : "NON OBLIGATOIRE"}
          </span>
        </div>

        <div className="p-5 rounded-lg bg-secondary/30 border border-border/40 space-y-4">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                checked={isRneRequired}
                onChange={(e) => setIsRneRequired(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer accent-primary"
              />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                Document PDF RNE Obligatoire lors de l&apos;inscription
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRneRequired ? (
                  <span className="text-primary font-medium">
                    ✓ Activé : Les nouvelles entreprises inscrites sur acya.site/enterprise-registration doivent obligatoirement fournir un fichier PDF RNE pour valider leur formulaire.
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    ⚠ Désactivé : L&apos;importation du document PDF RNE est optionnelle. Les entreprises peuvent enregistrer leur compte sans téléverser de document RNE.
                  </span>
                )}
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-sm font-medium rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SAVE CONFIGURATION</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* System Parameters Panel */}
      <div className="glass-panel p-8 rounded-xl bg-card/25 border border-border/50 space-y-6">
        <h2 className="text-lg font-semibold font-mono tracking-tight text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          SYSTEM PARAMETERS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">COMMAND CENTER VERSION</div>
            <div className="text-foreground font-semibold">v1.0.0-PROD</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">GATEWAY ROUTING DOMAIN</div>
            <div className="text-primary font-semibold">admin.acya.site</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">API BASE URL</div>
            <div className="text-foreground">{apiEndpoint}</div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">DATABASE STATUS</div>
            <div className="text-foreground flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dbStatus.includes("Connected") ? "bg-primary animate-pulse" : "bg-destructive"}`}></span>
              {dbStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
