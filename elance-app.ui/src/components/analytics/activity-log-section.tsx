'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  CreditCard,
  User,
  Package,
  Layers,
  ArrowRightLeft,
  Building2,
  Shield,
  Users,
  Search,
  RefreshCw,
  ChevronDown,
  PlusCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { AuditLog } from '@/types/audit';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Table → human-readable metadata
// ---------------------------------------------------------------------------

interface TableMeta {
  label: string;
  Icon: React.ElementType;
}

const TABLE_META: Record<string, TableMeta> = {
  Documents:       { label: 'Document',             Icon: FileText },
  Payments:        { label: 'Paiement',             Icon: CreditCard },
  AppUsers:        { label: 'Utilisateur',          Icon: User },
  Persons:         { label: 'Employé',              Icon: Users },
  Articles:        { label: 'Article',              Icon: Package },
  Inventories:     { label: 'Inventaire',           Icon: Layers },
  StockMovements:  { label: 'Mouvement de stock',   Icon: ArrowRightLeft },
  Enterprises:     { label: 'Paramètres entreprise', Icon: Building2 },
  AuditLogs:       { label: 'Système',              Icon: Shield },
  AccountLedger:   { label: 'Ligne comptable',      Icon: FileText },
};

const DEFAULT_META: TableMeta = { label: 'Enregistrement', Icon: FileText };

// ---------------------------------------------------------------------------
// Action → color palette
// ---------------------------------------------------------------------------

const ACTION_STYLE: Record<string, { bar: string; badge: string; text: string; icon: React.ElementType }> = {
  Insert: {
    bar:   'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text:  'text-emerald-700',
    icon:  PlusCircle,
  },
  Update: {
    bar:   'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text:  'text-amber-700',
    icon:  Pencil,
  },
  Delete: {
    bar:   'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text:  'text-rose-700',
    icon:  Trash2,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTableName(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === 'tbl_document' || lower === 'documents') return 'Documents';
  if (lower === 'tbl_payments' || lower === 'payments') return 'Payments';
  if (lower === 'tbl_appusers' || lower === 'appusers') return 'AppUsers';
  if (lower === 'tbl_persons' || lower === 'persons') return 'Persons';
  if (lower === 'tbl_articles' || lower === 'articles') return 'Articles';
  if (lower === 'tbl_inventories' || lower === 'inventories') return 'Inventories';
  if (lower === 'tbl_stockmovements' || lower === 'stockmovements') return 'StockMovements';
  if (lower === 'tbl_enterprises' || lower === 'enterprises') return 'Enterprises';
  if (lower === 'tbl_auditlogs' || lower === 'auditlogs') return 'AuditLogs';
  if (lower === 'tbl_account_ledger' || lower === 'accountledger') return 'AccountLedger';
  return raw;
}

function formatFriendlyName(raw: string): string {
  let friendly = raw.replace(/^tbl_/i, '');
  friendly = friendly.replace(/_/g, ' ');
  return friendly.charAt(0).toUpperCase() + friendly.slice(1).toLowerCase();
}

function safeJson(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function generateSentence(log: AuditLog): string {
  const nv  = safeJson(log.newValues);
  const ov  = safeJson(log.oldValues);
  const kv  = safeJson(log.keyValues);
  const normalizedTable = normalizeTableName(log.tableName);
  const action = log.action;

  // Try to extract the primary key (usually "Id")
  const recordId = kv.Id ?? kv.id ?? kv.ID ?? '';
  const idSuffix = recordId ? ` (ID: **${recordId}**)` : '';

  // --- Documents ---
  if (normalizedTable === 'Documents') {
    const ref = (nv.DocNumber ?? nv.docnumber ?? ov.DocNumber ?? ov.docnumber ?? '—') as string;
    const type = ((nv.DocumentType ?? nv.documenttype ?? ov.DocumentType ?? ov.documenttype ?? '') as string).toLowerCase();
    const typeLabel = type.includes('invoice')      ? 'Facture'
                    : type.includes('delivery')     ? 'Bon de Livraison'
                    : type.includes('quote')        ? 'Devis'
                    : type.includes('order')        ? 'Commande'
                    : type.includes('receipt')      ? 'Réception'
                    : 'Document';
    if (action === 'Insert') return `a créé le ${typeLabel} **${ref}**${idSuffix}`;
    if (action === 'Delete') return `a supprimé le ${typeLabel} **${ref}**${idSuffix}`;
    // Update — highlight status change if present
    const oldStatus = (ov.Status ?? ov.status ?? '') as string;
    const newStatus = (nv.Status ?? nv.status ?? '') as string;
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return `a modifié **${ref}**${idSuffix} : statut ${oldStatus} → ${newStatus}`;
    }
    return `a modifié le ${typeLabel} **${ref}**${idSuffix}`;
  }

  // --- Payments ---
  if (normalizedTable === 'Payments') {
    const amount = (nv.Amount ?? nv.amount ?? nv.TotalAmount ?? 0) as number;
    const formatted = amount > 0
      ? new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(amount) + ' TND'
      : '';
    if (action === 'Insert') return `a enregistré un règlement${idSuffix}${formatted ? ' de **' + formatted + '**' : ''}`;
    if (action === 'Delete') return `a annulé un règlement${idSuffix}${formatted ? ' de **' + formatted + '**' : ''}`;
    return `a modifié un règlement${idSuffix}`;
  }

  // --- AppUsers ---
  if (normalizedTable === 'AppUsers') {
    const name = (nv.UserName ?? nv.username ?? ov.UserName ?? ov.username ?? '') as string;
    const display = name ? `**${name}**` : '';
    if (action === 'Insert') return `a créé l'utilisateur ${display}${idSuffix}`;
    if (action === 'Delete') return `a supprimé l'utilisateur ${display}${idSuffix}`;
    return `a modifié le compte utilisateur ${display}${idSuffix}`;
  }

  // --- Persons (HR) ---
  if (normalizedTable === 'Persons') {
    const fname = (nv.Firstname ?? nv.firstname ?? '') as string;
    const lname = (nv.Lastname  ?? nv.lastname  ?? '') as string;
    const name = [fname, lname].filter(Boolean).join(' ') || '—';
    if (action === 'Insert') return `a ajouté l'employé **${name}**${idSuffix}`;
    if (action === 'Delete') return `a supprimé l'employé **${name}**${idSuffix}`;
    return `a modifié l'employé **${name}**${idSuffix}`;
  }

  // --- Articles ---
  if (normalizedTable === 'Articles') {
    const ref = (nv.Reference ?? nv.reference ?? ov.Reference ?? ov.reference ?? '—') as string;
    if (action === 'Insert') return `a créé l'article **${ref}**${idSuffix}`;
    if (action === 'Delete') return `a supprimé l'article **${ref}**${idSuffix}`;
    return `a modifié l'article **${ref}**${idSuffix}`;
  }

  // --- StockMovements ---
  if (normalizedTable === 'StockMovements') {
    const qty = (nv.Quantity ?? nv.quantity ?? '') as string | number;
    const display = qty ? ` (qté: ${qty})` : '';
    if (action === 'Insert') return `a créé un mouvement de stock${idSuffix}${display}`;
    if (action === 'Delete') return `a annulé un mouvement de stock${idSuffix}${display}`;
    return `a modifié un mouvement de stock${idSuffix}${display}`;
  }

  // --- Inventories ---
  if (normalizedTable === 'Inventories') {
    if (action === 'Insert') return `a démarré un inventaire${idSuffix}`;
    if (action === 'Delete') return `a annulé un inventaire${idSuffix}`;
    return `a mis à jour un inventaire${idSuffix}`;
  }

  // --- Enterprises ---
  if (normalizedTable === 'Enterprises') {
    return `a modifié les paramètres entreprise${idSuffix}`;
  }

  // --- AuditLogs (login event noise) ---
  if (normalizedTable === 'AuditLogs') {
    return `s'est connecté au système`;
  }

  // Generic fallback — still human-readable
  const friendlyName = formatFriendlyName(log.tableName);
  const meta = TABLE_META[normalizedTable] ?? { label: friendlyName, Icon: FileText };
  const verb = action === 'Insert' ? 'a créé' : action === 'Delete' ? 'a supprimé' : 'a modifié';
  return `${verb} un(e) ${meta.label} ${idSuffix}`.trim();
}

// ---------------------------------------------------------------------------
// Bold-text renderer for **markdown-like** bold in generated sentences
// ---------------------------------------------------------------------------

function SentenceWithBold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-bold text-forest-900">{p}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Single activity card
// ---------------------------------------------------------------------------

function ActivityCard({ log, index }: { log: AuditLog; index: number }) {
  const normalizedTable = normalizeTableName(log.tableName);
  const friendlyName    = formatFriendlyName(log.tableName);
  const meta            = TABLE_META[normalizedTable] ?? { label: friendlyName, Icon: FileText };
  const style           = ACTION_STYLE[log.action] ?? ACTION_STYLE.Update;
  const sentence        = generateSentence(log);

  // User initials avatar
  const initials = (log.userName ?? 'SY')

    .split(/[._-]/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');

  // Relative time (e.g. "il y a 3 minutes")
  const relativeTime = formatDistanceToNow(new Date(log.timestamp), {
    addSuffix: true,
    locale: fr,
  });

  // Absolute tooltip
  const absoluteTime = format(new Date(log.timestamp), "d MMM yyyy 'à' HH:mm", { locale: fr });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group flex items-start gap-4 p-4 rounded-2xl bg-white border border-forest-50 hover:border-forest-200 hover:shadow-sm transition-all duration-200"
    >
      {/* Left action color stripe */}
      <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', style.bar)} />

      {/* User avatar */}
      <div className="w-9 h-9 rounded-xl bg-forest-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 select-none">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-sand-600 font-medium leading-snug">
          <span className="font-bold text-forest-900">{log.userName ?? 'Système'}</span>{' '}
          <SentenceWithBold text={sentence} />
        </p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Table badge */}
          <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-sand-400 uppercase tracking-widest">
            <meta.Icon className="w-3 h-3" />
            {meta.label}
          </span>
          {/* Action badge */}
          <span className={cn('inline-flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-full border', style.badge)}>
            <style.icon className="w-3 h-3" />
            {log.action === 'Insert' ? 'Création' : log.action === 'Update' ? 'Modification' : 'Suppression'}
          </span>
          {/* Timestamp */}
          <time
            title={absoluteTime}
            className="text-[0.65rem] font-medium text-sand-400 cursor-help"
          >
            {relativeTime}
          </time>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Action filter tabs
// ---------------------------------------------------------------------------

type ActionFilter = 'all' | 'Insert' | 'Update' | 'Delete';

const TABS: { id: ActionFilter; label: string }[] = [
  { id: 'all',    label: 'Tous' },
  { id: 'Insert', label: 'Créations' },
  { id: 'Update', label: 'Modifications' },
  { id: 'Delete', label: 'Suppressions' },
];

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

export function ActivityLogSection() {
  const [userSearch, setUserSearch]     = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [count, setCount]               = useState(PAGE_SIZE);

  // Build filter object — undefined values are NOT sent to the API
  const filters = useMemo(() => ({
    count,
    userName:  userSearch.trim() || undefined,
    action:    actionFilter !== 'all' ? actionFilter as 'Insert' | 'Update' | 'Delete' : undefined,
  }), [count, userSearch, actionFilter]);

  const { data: logs, isLoading, isFetching, refetch } = useAuditLogs(filters);

  // Client-side secondary filter is already done server-side; just render
  const hasMore = (logs?.length ?? 0) >= count;

  return (
    <Card className="border-forest-100 rounded-[32px] bg-white overflow-hidden shadow-xl shadow-forest-900/2">
      <CardHeader className="p-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <CardTitle className="font-heading text-2xl text-forest-900 flex items-center gap-3">
              <span className="p-2 bg-forest-50 rounded-xl text-forest-700">
                <Shield className="w-5 h-5" />
              </span>
              Journal d&apos;Activité
            </CardTitle>
            <CardDescription className="text-sand-400 font-medium mt-1">
              Toutes les actions effectuées par les utilisateurs sur le système.
            </CardDescription>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* User search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
              <Input
                placeholder="Filtrer par utilisateur..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-sand-50/50 border-sand-200 w-[220px] text-sm focus-visible:ring-forest-500"
              />
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className={cn(
                'h-10 w-10 rounded-xl border-sand-200 text-sand-500 hover:text-forest-700 hover:border-forest-300',
                isFetching && 'animate-spin text-forest-600'
              )}
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action tabs */}
        <div className="flex gap-1 mt-6 bg-sand-50 p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActionFilter(tab.id); setCount(PAGE_SIZE); }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                actionFilter === tab.id
                  ? 'bg-white text-forest-900 shadow-sm border border-forest-100'
                  : 'text-sand-500 hover:text-forest-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-8 pt-4">
        {isLoading ? (
          // Skeleton placeholders
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-forest-50 animate-pulse">
                <div className="w-1 h-16 rounded-full bg-sand-100 flex-shrink-0" />
                <div className="w-9 h-9 rounded-xl bg-sand-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sand-100 rounded w-3/4" />
                  <div className="h-3 bg-sand-50 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="py-20 text-center">
            <Shield className="w-10 h-10 text-sand-200 mx-auto mb-3" />
            <p className="text-sand-400 font-medium text-sm">Aucune activité trouvée pour ces critères.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {logs.map((log, i) => (
                <ActivityCard key={log.id} log={log} index={i} />
              ))}
            </AnimatePresence>

            {/* Load more — bumps count by PAGE_SIZE, triggers a new query */}
            {hasMore && (
              <div className="pt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCount(c => c + PAGE_SIZE)}
                  disabled={isFetching}
                  className="rounded-xl border-forest-100 text-forest-700 font-bold hover:bg-forest-50 gap-2"
                >
                  {isFetching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Charger plus
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
