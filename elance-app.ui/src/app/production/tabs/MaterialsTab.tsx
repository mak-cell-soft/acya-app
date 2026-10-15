'use client';

import React, { useMemo } from 'react';
import { ProductionOrder } from '@/types/production';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Warehouse, Coins, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { stockService } from '@/services/components/stock.service';
import { salesSitesService } from '@/services/components/salessites.service';
import { useUpdateProductionOrder } from '@/hooks/use-production';

interface MaterialsTabProps {
  order: ProductionOrder;
}

export function MaterialsTab({ order }: MaterialsTabProps) {
  const updateOrderMutation = useUpdateProductionOrder();

  // Query all active sites for depot switching
  const { data: allSites = [] } = useQuery({
    queryKey: ['sales-sites'],
    queryFn: async () => {
      const res = await salesSitesService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Query actual warehouse stock for this order's sales site
  const { data: siteStocks = [] } = useQuery({
    queryKey: ['stock', 'by-site', order.salesSiteId],
    queryFn: () => stockService.getBySite({ id: order.salesSiteId }),
    enabled: !!order.salesSiteId && order.salesSiteId > 0,
  });

  const siteStockMap = useMemo(() => {
    const map = new Map<number, number>();
    if (Array.isArray(siteStocks)) {
      for (const s of siteStocks) {
        const mId = s.merchandiseId ?? s.merchandise_id ?? s.MerchandiseId;
        const qty = Number(s.stockQuantity ?? s.quantity ?? s.StockQuantity ?? 0);
        if (mId) {
          map.set(Number(mId), (map.get(Number(mId)) ?? 0) + qty);
        }
      }
    }
    return map;
  }, [siteStocks]);

  const handleSiteChange = async (newSiteId: number) => {
    if (newSiteId === order.salesSiteId) return;
    await updateOrderMutation.mutateAsync({
      id: order.id,
      data: { salesSiteId: newSiteId },
    });
  };

  // Aggregate all inputs by MerchandiseId
  const aggregatedMap = new Map<
    number,
    {
      merchandiseId: number;
      ref: string;
      designation: string;
      unit: string;
      plannedQty: number;
      actualQty: number;
      totalCost: number;
      currentStock: number;
      allowNegativStock: boolean;
      stepNames: string[];
    }
  >();

  for (const step of order.steps) {
    for (const input of step.inputs) {
      const existing = aggregatedMap.get(input.merchandiseId);
      const qty = input.actualQuantity ?? input.plannedQuantity;
      const cost = input.totalCost ?? 0;
      const availableStock = siteStockMap.has(input.merchandiseId)
        ? (siteStockMap.get(input.merchandiseId) ?? 0)
        : (input.currentStockQuantity ?? 0);
      const allowsNegative = input.allowNegativStock ?? false;

      if (!existing) {
        aggregatedMap.set(input.merchandiseId, {
          merchandiseId: input.merchandiseId,
          ref: input.merchandiseRef || `Lot #${input.merchandiseId}`,
          designation: input.merchandiseDesignation || 'Matière première',
          unit: input.unit || 'U',
          plannedQty: input.plannedQuantity,
          actualQty: qty,
          totalCost: cost,
          currentStock: availableStock,
          allowNegativStock: allowsNegative,
          stepNames: [step.name],
        });
      } else {
        existing.plannedQty += input.plannedQuantity;
        existing.actualQty += qty;
        existing.totalCost += cost;
        if (allowsNegative) existing.allowNegativStock = true;
        if (!existing.stepNames.includes(step.name)) {
          existing.stepNames.push(step.name);
        }
      }
    }
  }

  const materialsList = Array.from(aggregatedMap.values());
  const hasInsufficientStock = materialsList.some(
    (m) =>
      order.status !== 'Validated' &&
      order.status !== 'Cancelled' &&
      !m.allowNegativStock &&
      m.currentStock < m.actualQty
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-corp-blue-600" />
            Bilan des Matières Premières & Disponibilité Stock
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
            <span>Dépôt source :</span>
            {order.status !== 'Validated' && order.status !== 'Cancelled' ? (
              <select
                value={order.salesSiteId}
                onChange={(e) => handleSiteChange(Number(e.target.value))}
                disabled={updateOrderMutation.isPending}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-corp-blue-500"
              >
                {allSites.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.gov ? `${site.gov} - ` : ''}
                    {site.address || `Dépôt #${site.id}`}
                    {site.isForsale ? ' (Dépôt Principal / Vente)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-slate-800 font-semibold">
                {order.salesSiteName || `Dépôt #${order.salesSiteId}`}
              </strong>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500">Total Matières : </span>
            <strong className="font-mono text-slate-900 ml-1">
              {(order.totalMaterialCost ?? 0).toFixed(3)} TND
            </strong>
          </div>
        </div>
      </div>

      {/* Stock warning banner if insufficient */}
      {hasInsufficientStock && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-rose-900">Alerte : Stock insuffisant pour validation</h5>
            <p className="mt-0.5 text-rose-700 leading-relaxed">
              Une ou plusieurs matières premières requises ont un stock disponible inférieur à la consommation requise au dépôt sélectionné (<strong>{order.salesSiteName || `Dépôt #${order.salesSiteId}`}</strong>). L'ordre ne pourra pas être validé tant que les quantités ne sont pas approvisionnées ou que le bon dépôt source n'est pas sélectionné.
            </p>
          </div>
        </div>
      )}

      {/* Consolidated Materials Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="border-b border-slate-200">
              <TableHead className="text-xs font-bold text-slate-700">Matière Première</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Étapes Associées</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Qté Prévue</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Qté Réelle Consommée</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Stock Disponible</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Coût Total (TND)</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-center">État</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 text-xs">
            {materialsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400 italic">
                  Aucune matière première déclarée sur cet ordre.
                </TableCell>
              </TableRow>
            ) : (
              materialsList.map((mat) => {
                const isShort =
                  order.status !== 'Validated' &&
                  order.status !== 'Cancelled' &&
                  !mat.allowNegativStock &&
                  mat.currentStock < mat.actualQty;

                return (
                  <TableRow key={mat.merchandiseId} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-medium">
                      <p className="font-bold text-slate-900">{mat.ref}</p>
                      <p className="text-slate-500 text-[11px] truncate max-w-xs">{mat.designation}</p>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mat.stepNames.map((sName, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                          >
                            {sName}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono font-medium text-slate-600">
                      {mat.plannedQty} {mat.unit}
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {mat.actualQty} {mat.unit}
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      <span className={isShort ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'}>
                        {mat.currentStock} {mat.unit}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {mat.totalCost.toFixed(3)}
                    </TableCell>

                    <TableCell className="text-center">
                      {order.status === 'Validated' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Déduit
                        </span>
                      ) : isShort ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Insuffisant
                        </span>
                      ) : mat.allowNegativStock && mat.currentStock < mat.actualQty ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" title="Stock négatif autorisé">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Autorisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

