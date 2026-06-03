'use client';

import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Printer, FileText, LayoutTemplate, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEnterprise } from '@/hooks/use-enterprise';
import { Document } from '@/types/document';
import { StockTransferInfo, StockTransferDetails } from '@/types/stock';
import { getStandardPrintStyles, getLightPrintStyles } from './print-styles';
import { DeliveryNoteStandard } from './delivery-note-standard';
import { DeliveryNoteLight } from './delivery-note-light';
import { InvoiceStandard } from './invoice-standard';
import { InvoiceLight } from './invoice-light';
import { StockTransferStandard } from './stock-transfer-standard';
import { StockTransferLight } from './stock-transfer-light';
import { LeaveStandard } from './leave-standard';
import { AdvanceStandard } from './advance-standard';
import { PayslipStandard } from './payslip-standard';
import { PayslipLight } from './payslip-light';
import { Person } from '@/types/team';
import { Leave, Payslip, Advance } from '@/types/hr';
import { AccountStatementStandard } from './account-statement-standard';
import { AccountStatement, Customer, Supplier } from '@/types/customer';

interface PrintVariantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document?: Document | null | undefined;
  transfer?: StockTransferInfo | null | undefined;
  transferDetails?: StockTransferDetails[] | null | undefined;
  employee?: Person | null | undefined;
  leave?: Leave | null | undefined;
  payslip?: Payslip | null | undefined;
  advance?: Advance | null | undefined;
  statement?: AccountStatement | null;
  counterpart?: Customer | Supplier | null;
  periodStart?: Date;
  periodEnd?: Date;
  statementType?: 'customer' | 'supplier';
  docType: 'bl' | 'invoice' | 'transfer' | 'leave' | 'advance' | 'payslip' | 'customer-statement' | 'supplier-statement' | null | undefined;
}

export function PrintVariantDialog({
  isOpen,
  onClose,
  document,
  transfer,
  transferDetails,
  employee,
  leave,
  payslip,
  advance,
  statement,
  counterpart,
  periodStart,
  periodEnd,
  statementType,
  docType,
}: PrintVariantDialogProps) {
  // Retrieve the connected enterprise settings dynamically.
  // This satisfies the critical requirement: "No it should be the name of the connected enterprise".
  const { data: enterprise, isLoading } = useEnterprise();
  const [printing, setPrinting] = useState(false);

  // Auto-trigger print for single-variant HR documents (leave, advance) and statements as soon as enterprise settings load
  React.useEffect(() => {
    if (isOpen && enterprise && !isLoading && !printing && 
       (docType === 'leave' || docType === 'advance' || docType === 'customer-statement' || docType === 'supplier-statement')) {
      handlePrint('standard');
    }
  }, [isOpen, enterprise, isLoading, docType]);

  if (
    docType !== 'transfer' &&
    docType !== 'leave' &&
    docType !== 'advance' &&
    docType !== 'payslip' &&
    docType !== 'customer-statement' &&
    docType !== 'supplier-statement' &&
    (!document || !docType)
  ) return null;
  if (docType === 'transfer' && !transfer) return null;
  if (docType === 'leave' && (!leave || !employee)) return null;
  if (docType === 'advance' && (!advance || !employee)) return null;
  if (docType === 'payslip' && (!payslip || !employee)) return null;
  if ((docType === 'customer-statement' || docType === 'supplier-statement') && (!statement || !counterpart || !periodStart || !periodEnd || !statementType)) return null;

  /**
   * Executes the print flow by generating markup, injecting it into a hidden iframe,
   * applying the printer CSS, and invoking browser's print dialog.
   */
  const handlePrint = (variant: 'standard' | 'light') => {
    if (!enterprise) return;

    setPrinting(true);
    try {
      // 1. Determine layout markup and CSS stylesheet based on document type and printer variant
      let contentHtml = '';
      let styleCss = '';
      let printDocNumber = '';

      if (docType === 'bl' && document) {
        printDocNumber = document.docnumber || '';
        styleCss = variant === 'standard' ? getStandardPrintStyles() : getLightPrintStyles();
        contentHtml = renderToStaticMarkup(
          variant === 'standard' ? (
            <DeliveryNoteStandard document={document} enterprise={enterprise} />
          ) : (
            <DeliveryNoteLight document={document} enterprise={enterprise} />
          )
        );
      } else if (docType === 'invoice' && document) {
        printDocNumber = document.docnumber || '';
        styleCss = variant === 'standard' ? getStandardPrintStyles() : getLightPrintStyles();
        contentHtml = renderToStaticMarkup(
          variant === 'standard' ? (
            <InvoiceStandard document={document} enterprise={enterprise} />
          ) : (
            <InvoiceLight document={document} enterprise={enterprise} />
          )
        );
      } else if (docType === 'transfer' && transfer) {
        printDocNumber = transfer.docSortie || '';
        styleCss = variant === 'standard' ? getStandardPrintStyles() : getLightPrintStyles();
        contentHtml = renderToStaticMarkup(
          variant === 'standard' ? (
            <StockTransferStandard transfer={transfer} details={transferDetails || []} enterprise={enterprise} />
          ) : (
            <StockTransferLight transfer={transfer} details={transferDetails || []} enterprise={enterprise} />
          )
        );
      } else if (docType === 'leave' && leave && employee) {
        printDocNumber = `CONGE-${employee.lastname}-${leave.id}`;
        styleCss = getStandardPrintStyles();
        contentHtml = renderToStaticMarkup(
          <LeaveStandard employee={employee} leave={leave} enterprise={enterprise} />
        );
      } else if (docType === 'advance' && advance && employee) {
        printDocNumber = `AVANCE-${employee.lastname}-${advance.id}`;
        styleCss = getStandardPrintStyles();
        contentHtml = renderToStaticMarkup(
          <AdvanceStandard employee={employee} advance={advance} enterprise={enterprise} />
        );
      } else if (docType === 'payslip' && payslip && employee) {
        printDocNumber = `BULLETIN-${employee.lastname}-${payslip.periodmonth}-${payslip.periodyear}`;
        styleCss = variant === 'standard' ? getStandardPrintStyles() : getLightPrintStyles();
        contentHtml = renderToStaticMarkup(
          variant === 'standard' ? (
            <PayslipStandard employee={employee} payslip={payslip} enterprise={enterprise} />
          ) : (
            <PayslipLight employee={employee} payslip={payslip} enterprise={enterprise} />
          )
        );
      } else if ((docType === 'customer-statement' || docType === 'supplier-statement') && statement && counterpart && periodStart && periodEnd && statementType) {
        // Use formatDate or simply format with date-fns since periodStart is a Date
        const { format } = require('date-fns');
        printDocNumber = `ETAT-COMPTE-${counterpart.name || counterpart.id}-${format(periodStart, 'dd-MM-yyyy')}-${format(periodEnd, 'dd-MM-yyyy')}`;
        const { getAccountStatementPrintStyles } = require('./print-styles');
        styleCss = getAccountStatementPrintStyles();
        contentHtml = renderToStaticMarkup(
          <AccountStatementStandard
            statement={statement}
            counterpart={counterpart}
            enterprise={enterprise}
            periodStart={periodStart}
            periodEnd={periodEnd}
            statementType={statementType}
          />
        );
      }

      // 2. Create a temporary hidden iframe to isolate print styles from the main Next.js layout
      const iframe = window.document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      window.document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error("Could not access iframe document context.");
      }

      // 3. Write HTML document structure, injecting print CSS stylesheets in head
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimer - ${printDocNumber || 'Document'}</title>
            <style>${styleCss}</style>
          </head>
          <body>
            ${contentHtml}
          </body>
        </html>
      `);
      doc.close();

      // NOTE: Wait briefly to ensure stylesheets are evaluated and fonts finish downloading.
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error(e);
        }
        
        // Cleanup the temporary DOM element.
        setTimeout(() => {
          window.document.body.removeChild(iframe);
        }, 1000);

        setPrinting(false);
        onClose();
      }, 500);

    } catch (error) {
      console.error('Printing failed:', error);
      setPrinting(false);
      onClose();
    }
  };

  const isAutoPrint = docType === 'leave' || docType === 'advance' || docType === 'customer-statement' || docType === 'supplier-statement';

  if (isAutoPrint) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-[24px] border border-sand-200 bg-white p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-serif font-bold text-forest-950 flex items-center gap-2">
            <Printer className="w-5.5 h-5.5 text-forest-800" />
            Impression Document
          </DialogTitle>
          <DialogDescription className="text-sm text-sand-500 font-medium">
            Choisissez le format d&apos;impression adapté à votre matériel. 
            Document N° <span className="font-mono font-bold text-forest-900">
              {docType === 'transfer'
                ? (transfer?.docSortie || 'Brouillon')
                : docType === 'payslip'
                ? `Bulletin ${payslip?.periodmonth}/${payslip?.periodyear}`
                : (document?.docnumber || 'Brouillon')}
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-forest-800" />
            <p className="text-xs font-bold text-sand-400 uppercase tracking-widest">
              Chargement des paramètres entreprise...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pt-4">
            {/* Standard Laser Printer Option */}
            <button
              onClick={() => handlePrint('standard')}
              disabled={printing}
              className="flex items-start text-left gap-4 p-4 rounded-[16px] border border-sand-200 bg-white hover:bg-sand-50/50 hover:border-forest-800/40 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-forest-50 border border-forest-100 text-forest-800 group-hover:bg-forest-100/50 transition-colors">
                <LayoutTemplate className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-forest-950 group-hover:text-forest-800 transition-colors">
                  Format Standard (Laser / A4)
                </h4>
                <p className="text-xs text-sand-400 font-medium leading-relaxed">
                  Mise en page complète avec logos, tableaux de taxes structurés, signature A4 et mentions légales. Idéal laser & jet d&apos;encre.
                </p>
              </div>
            </button>

            {/* Light Dot Matrix Option — auto-print types never reach the dialog, so no condition needed */}
            <button
              onClick={() => handlePrint('light')}
              disabled={printing}
              className="flex items-start text-left gap-4 p-4 rounded-[16px] border border-sand-200 bg-white hover:bg-sand-50/50 hover:border-forest-800/40 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 group-hover:bg-amber-100/50 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-forest-950 group-hover:text-forest-800 transition-colors">
                  Format Léger (Matricielle / Aiguilles)
                </h4>
                <p className="text-xs text-sand-400 font-medium leading-relaxed">
                  Style compact en police monospace. Supprime les bordures épaisses et illustrations pour optimiser le temps d&apos;impression et économiser le ruban.
                </p>
              </div>
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-sand-100 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-sand-200 text-sand-600 font-bold hover:bg-sand-50"
            disabled={printing}
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
