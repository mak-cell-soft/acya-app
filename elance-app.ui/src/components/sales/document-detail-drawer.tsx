'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Calendar,
  User,
  Truck,
  Building,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { documentService } from '@/services/components/document.service';
import { DocumentTypes, DocStatus, Document } from '@/types/document';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
  onNavigateToRelated?: (id: number) => void;
  onPrint?: (doc: Document) => void;
}

export function DocumentDetailDrawer({
  isOpen,
  onClose,
  documentId,
  onNavigateToRelated,
  onPrint
}: DocumentDetailDrawerProps) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      setLoading(true);
      documentService
        .getById(documentId)
        .then((data) => {
          setDoc(data);
        })
        .catch((err) => {
          console.error('Failed to fetch document details:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDoc(null);
    }
  }, [isOpen, documentId]);

  // Helper to format currency
  const formatMoney = (amount: number, currencyCode?: string) => {
    const symbol = currencyCode === 'EUR' ? '€' : currencyCode === 'USD' ? '$' : 'DT';
    return `${(amount || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    })} ${symbol}`;
  };

  const formatQuantity = (qty: number, unit?: string | null) => {
    const isM3 = unit?.toUpperCase().includes('M3') || unit?.toUpperCase().includes('MÈTRE 3') || unit?.toUpperCase().includes('METRE 3');
    if (isM3) {
      return qty.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return qty.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    }
  };

  // Map doc type to readable name & styling classes
  const getDocTypeInfo = (type: DocumentTypes) => {
    switch (type) {
      case DocumentTypes.customerQuote:
        return { label: 'Devis Client', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case DocumentTypes.customerOrder:
        return { label: 'Commande Client', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case DocumentTypes.customerDeliveryNote:
        return { label: 'Bon de Livraison', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case DocumentTypes.customerInvoice:
        return { label: 'Facture Client', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      default:
        return { label: 'Document', color: 'bg-sand-50 text-sand-800 border-sand-200' };
    }
  };

  // Map doc status
  const getStatusBadge = (status: DocStatus) => {
    switch (status) {
      case DocStatus.Validated:
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Validé
          </Badge>
        );
      case DocStatus.Created:
        return (
          <Badge className="bg-blue-50 text-blue-800 border border-blue-200 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Créé
          </Badge>
        );
      case DocStatus.Deleted:
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Annulé
          </Badge>
        );
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  // Trigger browser print of document or use custom print wrapper if provided
  const handlePrint = () => {
    if (doc && onPrint && (doc.type === DocumentTypes.customerDeliveryNote || doc.type === DocumentTypes.customerInvoice)) {
      onPrint(doc);
    } else {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Floating Sheet Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col z-10 border-l border-sand-100"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-corp-blue-950 text-white flex items-center justify-between border-b border-corp-blue-900">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-bold tracking-widest text-sand-400">
                  {doc ? getDocTypeInfo(doc.type).label : 'Détails Document'}
                </span>
                {doc && getStatusBadge(doc.docstatus)}
              </div>
              <h2 className="text-2xl tracking-wide text-sand-100">
                {doc ? doc.docnumber || 'Brouillon' : 'Chargement...'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {doc && (
                <Button
                  onClick={handlePrint}
                  variant="ghost"
                  className="text-sand-100 hover:bg-corp-blue-900 hover:text-white"
                >
                  <Printer className="w-4 h-4 mr-2" /> Imprimer
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-sand-300 hover:bg-corp-blue-900 hover:text-white "
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#fcfbfa]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-corp-blue-600"></div>
                <p className="text-xs text-sand-400 font-bold uppercase tracking-widest">
                  Chargement des détails...
                </p>
              </div>
            ) : doc ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Related Documents Stepper Info */}
                {(doc.parentdocuments?.length || 0) > 0 || (doc.childdocuments?.length || 0) > 0 ? (
                  <Card className="bg-sand-50/50 border-sand-200/60 rounded-[16px] overflow-hidden">
                    <CardContent className="p-4 flex flex-wrap items-center gap-4 text-sm text-sand-700">
                      {doc.parentdocuments && doc.parentdocuments.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sand-400 uppercase tracking-wider">
                            Généré depuis :
                          </span>
                          {doc.parentdocuments.map((parent: any) => (
                            <Badge
                              key={parent.id}
                              variant="outline"
                              onClick={() => onNavigateToRelated?.(parent.id)}
                              className="cursor-pointer border-sand-300 bg-white hover:bg-sand-100 transition-colors gap-1 text-xs"
                            >
                              {parent.docnumber} <ArrowRight className="w-3 h-3 text-sand-400" />
                            </Badge>
                          ))}
                        </div>
                      )}

                      {doc.childdocuments && doc.childdocuments.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sand-400 uppercase tracking-wider">
                            Converti en :
                          </span>
                          {doc.childdocuments.map((child: any) => (
                            <Badge
                              key={child.id}
                              variant="outline"
                              onClick={() => onNavigateToRelated?.(child.id)}
                              className="cursor-pointer border-sand-300 bg-white hover:bg-sand-100 transition-colors gap-1 text-xs"
                            >
                              {child.docnumber}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Two-Column Core Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Client Info Card */}
                  <Card className="rounded-[20px] border-sand-200/80 shadow-xs bg-white">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-corp-blue-800">
                        <User className="w-5 h-5 text-sand-500" />
                        <span className="font-bold text-lg">Informations Client</span>
                      </div>
                      <Separator className="bg-sand-100" />
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-sand-400">Raison Sociale:</span>
                          <span className="font-bold text-sand-900">
                            {doc.counterpart?.name || `${doc.counterpart?.firstname || ''} ${doc.counterpart?.lastname || ''}`.trim() || 'Client sans nom'}
                          </span>
                        </div>
                        {doc.counterpart?.phonenumberone && (
                          <div className="flex justify-between">
                            <span className="text-sand-400">Téléphone:</span>
                            <span className="font-medium text-sand-700">{doc.counterpart.phonenumberone}</span>
                          </div>
                        )}
                        {doc.counterpart?.taxregistrationnumber && (
                          <div className="flex justify-between">
                            <span className="text-sand-400">Matricule Fiscal:</span>
                            <span className="font-mono text-xs bg-sand-50 px-2 py-0.5 rounded text-sand-700 border border-sand-200/60">
                              {doc.counterpart.taxregistrationnumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Params Card */}
                  <Card className="rounded-[20px] border-sand-200/80 shadow-xs bg-white">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-corp-blue-800">
                        <FileText className="w-5 h-5 text-sand-500" />
                        <span className="font-bold text-lg">Paramètres Transaction</span>
                      </div>
                      <Separator className="bg-sand-100" />
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-sand-400">Date d&apos;émission:</span>
                          <span className="font-medium text-sand-900 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-sand-400" />
                            {new Date(doc.creationdate!).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        {doc.sales_site && (
                          <div className="flex justify-between">
                            <span className="text-sand-400">Dépôt / Site:</span>
                            <span className="font-medium text-sand-700 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-sand-400" />
                              {doc.sales_site.gov}
                            </span>
                          </div>
                        )}
                        {doc.transporter && (
                          <div className="flex justify-between">
                            <span className="text-sand-400">Transporteur:</span>
                            <span className="font-medium text-sand-700 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-sand-400" />
                              {doc.transporter.fullname}
                            </span>
                          </div>
                        )}
                        {doc.currency && (
                          <div className="flex justify-between">
                            <span className="text-sand-400">Devise de facturation:</span>
                            <span className="font-bold text-sand-800 uppercase">
                              {doc.currency} (Taux: {doc.exchangeRate || '1.000'})
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items Grid Table */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-corp-blue-950 px-1">Lignes Articles</h3>
                  <div className="border border-sand-200/80 rounded-[20px] overflow-hidden bg-white shadow-xs">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-sand-50/50 border-b border-sand-200 text-sand-400 font-bold uppercase text-xs tracking-wider">
                          <th className="px-6 py-4">Article</th>
                          <th className="px-4 py-4 text-right">Prix Unit HT</th>
                          <th className="px-4 py-4 text-center">Quantité</th>
                          <th className="px-4 py-4 text-right">Remise</th>
                          <th className="px-4 py-4 text-center">TVA</th>
                          <th className="px-6 py-4 text-right">Total TTC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-100 text-sand-800">
                        {doc.merchandises?.map((row: any, index: number) => (
                          <tr key={index} className="hover:bg-sand-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-sand-900">{row.article?.description}</div>
                              <div className="text-xs text-sand-400 font-mono mt-0.5">
                                {row.article?.reference}
                              </div>
                              {/* Wood pieces allocation if wood article */}
                              {row.article?.iswood && row.lisoflengths && row.lisoflengths.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {row.lisoflengths.map((len: any, lIdx: number) => (
                                    <span
                                      key={lIdx}
                                      className="inline-flex text-[10px] font-mono px-2 py-0.5 bg-sand-100 text-sand-600 rounded-md border border-sand-200/60"
                                    >
                                      L:{len.length?.value || 'N/A'} × {len.nbpieces}pcs ({formatMoney(len.quantity, '')} M³)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right font-mono font-medium">
                              {formatMoney(row.unit_price_ht, doc.currency)}
                            </td>
                            <td className="px-4 py-4 text-center font-bold">
                              {row.article?.iswood ? (
                                <div className="space-y-0.5">
                                  <div>{formatMoney(row.quantity, '')} M³</div>
                                  <div className="text-[10px] text-sand-400 font-mono">
                                    {row.lisoflengths?.reduce((acc: number, curr: any) => acc + (curr.nbpieces || 0), 0) || 0} pcs
                                  </div>
                                </div>
                              ) : (
                                `${formatQuantity(row.quantity, row.article?.unit)} ${row.article?.unit || 'u'}`
                              )}
                            </td>
                            <td className="px-4 py-4 text-right text-sand-500 font-mono">
                              {row.discount_percentage > 0 ? (
                                <span className="inline-flex items-center text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                  <TrendingDown className="w-3 h-3 mr-0.5" /> -{row.discount_percentage}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-sand-600 font-mono">
                              {String(row.article?.tva?.value || 19).replace('%', '').trim()}%
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-sand-900 font-mono">
                              {formatMoney(row.cost_ttc, doc.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-4">
                  {/* Notes / T&C Section */}
                  <div className="md:col-span-6 space-y-4">
                    {doc.description && (
                      <Card className="rounded-[20px] border-sand-200/60 shadow-xs bg-white p-6">
                        <h4 className="text-sm font-medium text-sand-400 mb-2">
                          Notes / Observations
                        </h4>
                        <p className="text-sm text-sand-700 leading-relaxed font-sans">{doc.description}</p>
                      </Card>
                    )}
                  </div>

                  {/* Calculations Sheet */}
                  <div className="md:col-span-6 border border-sand-200/80 rounded-xl overflow-hidden bg-white shadow-xs p-6 space-y-4">
                    <h3 className="font-bold text-lg text-corp-blue-950 border-b border-sand-100 pb-2">
                      Détail Financier
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sand-600">
                        <span>Total Brut HT:</span>
                        <span>{formatMoney(doc.total_ht_net_doc + doc.total_discount_doc || 0, doc.currency)}</span>
                      </div>
                      {doc.total_discount_doc > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Total Remise:</span>
                          <span>-{formatMoney(doc.total_discount_doc, doc.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sand-950 font-bold border-b border-sand-50 pb-2">
                        <span>Net HT:</span>
                        <span>{formatMoney(doc.total_ht_net_doc || 0, doc.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sand-600">
                        <span>TVA (Taxe sur la valeur ajoutée):</span>
                        <span>{formatMoney(doc.total_tva_doc || 0, doc.currency)}</span>
                      </div>
 
                      {/* Invoice Specific Taxes */}
                      {doc.type === DocumentTypes.customerInvoice && (
                        <>
                          {doc.taxe && doc.taxe.taxvalue > 0 && (
                            <div className="flex justify-between text-sand-700">
                              <span>Timbre Fiscal:</span>
                              <span>+{formatMoney(doc.taxe.taxvalue, doc.currency)}</span>
                            </div>
                          )}
                          {doc.holdingtax && doc.holdingtax.taxvalue > 0 && (
                            <div className="flex justify-between text-purple-800">
                              <span>Retenue à la source ({doc.holdingtax.taxpercentage}%):</span>
                              <span className="font-semibold">
                                -{formatMoney(doc.holdingtax.taxvalue, doc.currency)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
 
                      <Separator className="bg-sand-200 mt-2" />
 
                      {/* Final Net Payable */}
                      <div className="flex justify-between items-center text-corp-blue-950 pt-2">
                        <span className="text-base font-bold">Net à Payer (TTC):</span>
                        <span className="text-2xl font-bold font-mono text-corp-blue-800">
                          {formatMoney(doc.total_net_payable || doc.total_net_ttc || 0, doc.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-sand-400 py-12">Impossible de charger le document.</div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

