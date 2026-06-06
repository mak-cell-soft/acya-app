'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  Gavel,
  Settings,
  Eye,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Calendar,
  Lock,
  ChevronLeft,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { approvalService, DocumentApproval, ApprovalDecision } from '@/services/components/approval.service';
import { DocumentDetailDrawer } from '@/components/sales/document-detail-drawer';
import { ApprovalDecisionDialog } from '@/components/purchases/approval-decision-dialog';
import { ApprovalSettingsDialog } from '@/components/purchases/approval-settings-dialog';
import { toast } from 'sonner';

export default function ApprovalsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [approvals, setApprovals] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Drawer states
  const [selectedDocIdForDetail, setSelectedDocIdForDetail] = useState<number | null>(null);
  const [activeApprovalForDecision, setActiveApprovalForDecision] = useState<DocumentApproval | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const enterpriseId = user?.enterpriseId ? parseInt(user.enterpriseId) : 0;
  const currentUserId = user?.id ? parseInt(user.id) : 0;

  useEffect(() => {
    if (isAuthenticated && !loading && !isAdmin) {
      toast.error('Accès refusé. Vous devez être administrateur pour accéder à cette page.');
    }
  }, [isAuthenticated, loading, isAdmin]);

  const loadPendingApprovals = async () => {
    if (enterpriseId <= 0) return;
    setLoading(true);
    try {
      const data = await approvalService.getPending(enterpriseId);
      setApprovals(data || []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
      toast.error('Erreur lors du chargement des approbations en attente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enterpriseId > 0 && isAdmin) {
      loadPendingApprovals();
    } else if (!user) {
      // Wait for auth store to hydrate
      const timer = setTimeout(() => {
        setLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }
  }, [enterpriseId, user]);

  const filteredApprovals = approvals.filter((app) => {
    const term = searchTerm.toLowerCase();
    const docNumber = (app.document?.docnumber || '').toLowerCase();
    const counterpart = (
      app.document?.counterpart?.name || 
      `${app.document?.counterpart?.firstname || ''} ${app.document?.counterpart?.lastname || ''}`
    ).toLowerCase();
    const submittedBy = (
      app.submittedBy?.fullname || 
      `${app.submittedBy?.person?.firstname || ''} ${app.submittedBy?.person?.lastname || ''}`
    ).toLowerCase();

    return docNumber.includes(term) || counterpart.includes(term) || submittedBy.includes(term);
  });

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  // Access check fallback UI
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-amber-900" />
          <span className="text-xs font-bold font-mono tracking-widest uppercase">Chargement des données...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto my-12 text-center space-y-6 animate-in fade-in duration-500">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-3xl inline-block text-rose-800">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-slate-900">Accès Refusé</h1>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Désolé, vous n&apos;avez pas les autorisations nécessaires pour gérer les approbations. Veuillez contacter votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
            </p>
          </div>
          <Button
            onClick={() => router.push('/purchases')}
            className="bg-corp-blue-600 hover:bg-corp-blue-700 text-white rounded-xl font-bold text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Retour aux Achats
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-950/10 text-amber-900 rounded-xl">
                <Gavel className="w-5 h-5 animate-pulse" />
              </span>
              <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase font-mono">
                Panneau d&apos;approbations
              </span>
            </div>
            <h1 className="text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
              Approbations en Attente
            </h1>
            <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
              Gérez les demandes d&apos;approbation pour les bons de commande de marchandises dépassant le seuil budgétaire de l&apos;entreprise.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/purchases')}
              className="h-11 rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50 gap-2 flex items-center transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Retour aux Achats
            </Button>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              className="h-11 rounded-xl bg-corp-blue-50/90 text-corp-blue-950 border-b border-corp-blue-100 hover:bg-corp-blue-50 font-bold shadow-lg gap-2 flex items-center transition-all"
            >
              <Settings className="w-4 h-4" /> Paramètres
            </Button>
          </div>
        </div>

        {/* Filter and Search actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher par N° Doc, fournisseur, expéditeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 border-slate-200 focus-visible:ring-amber-900 rounded-xl text-xs font-semibold bg-white"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
            {filteredApprovals.length} Commande{filteredApprovals.length > 1 ? 's' : ''} en attente
          </span>
        </div>

        {/* Pending Approvals Table Card */}
        <Card className="border-slate-200/60 shadow-xl shadow-slate-900/5 rounded-xl overflow-hidden bg-white">
          <CardHeader className="bg-corp-blue-50/90 text-corp-blue-950 border-b border-corp-blue-100 p-5">
            <CardTitle className="text-sm font-serif font-bold text-corp-blue-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-corp-blue-500" /> Demandes de Validation
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 font-medium">
              Veuillez examiner la conformité des prix unitaires et quantités avant d&apos;approuver la commande fournisseur.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">N°</th>
                    <th className="p-4 min-w-[120px]">N° Document</th>
                    <th className="p-4 min-w-[200px]">Contrepartie / Fournisseur</th>
                    <th className="p-4 min-w-[140px]">Montant TTC</th>
                    <th className="p-4 min-w-[160px]">Soumis par</th>
                    <th className="p-4 min-w-[150px]">Date soumission</th>
                    <th className="p-4 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {filteredApprovals.length > 0 ? (
                      filteredApprovals.map((app, index) => {
                        const doc = app.document;
                        const supplierName =
                          doc?.counterpart?.name ||
                          `${doc?.counterpart?.firstname || ''} ${doc?.counterpart?.lastname || ''}`.trim() ||
                          'Fournisseur inconnu';

                        const submitterName =
                          app.submittedBy?.fullname ||
                          `${app.submittedBy?.person?.firstname || ''} ${app.submittedBy?.person?.lastname || ''}`.trim() ||
                          app.submittedBy?.email ||
                          `Utilisateur ${app.submittedByUserId}`;

                        const formattedDate = new Date(app.submittedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <motion.tr
                            key={app.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25, delay: index * 0.05 }}
                            className="group hover:bg-amber-50/10 transition-colors font-sans text-xs text-slate-700 font-bold"
                          >
                            <td className="p-4 text-center text-slate-400 font-mono font-medium">{index + 1}</td>
                            <td className="p-4 font-mono font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                              {doc?.docnumber || 'N/A'}
                            </td>
                            <td className="p-4">
                              <span className="text-slate-800 font-bold">{supplierName}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-mono text-amber-900 font-extrabold">
                                {fmt(doc?.total_net_ttc || 0)} TND
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>{submitterName}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formattedDate}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedDocIdForDetail(app.documentId)}
                                  className="w-8 h-8 rounded-lg hover:bg-amber-50 hover:text-amber-900 text-slate-400 transition-colors"
                                  title="Voir détails"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => setActiveApprovalForDecision(app)}
                                  className="h-8 rounded-lg bg-amber-900 hover:bg-amber-950 text-white text-[11px] font-bold px-3 shadow-sm gap-1 flex items-center transition-all"
                                >
                                  <Gavel className="w-3.5 h-3.5" />
                                  <span>Décider</span>
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-24 text-center text-slate-400 italic font-medium">
                          Aucune demande d&apos;approbation en attente.
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Detailed Document Drawer view */}
      <DocumentDetailDrawer
        isOpen={selectedDocIdForDetail !== null}
        documentId={selectedDocIdForDetail}
        onClose={() => setSelectedDocIdForDetail(null)}
        onNavigateToRelated={(id) => setSelectedDocIdForDetail(id)}
      />

      {/* Action Dialog: Approve or Reject decision */}
      <ApprovalDecisionDialog
        isOpen={activeApprovalForDecision !== null}
        onClose={() => setActiveApprovalForDecision(null)}
        approval={activeApprovalForDecision}
        currentUserId={currentUserId}
        onSuccess={loadPendingApprovals}
      />

      {/* Configuration Settings Modal Dialog */}
      <ApprovalSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        enterpriseId={enterpriseId}
      />
    </DashboardLayout>
  );
}




