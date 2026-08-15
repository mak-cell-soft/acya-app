/**
 * Return standard A4 CSS print styles, based on the Angular `print-styles.util.ts`.
 * Focuses on maintaining layout integrity, borders, grids, and A4 print dimensions.
 */
export function getStandardPrintStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Outfit:wght@400;600;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, sans-serif;
      background: #fff !important;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 10mm;
      background: #fff !important;
      font-size: 9pt;
      color: #000;
    }

    .header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 10mm;
      margin-bottom: 8mm;
      padding-bottom: 5mm;
      border-bottom: 1px solid #000;
    }

    .company-info {
      text-align: left;
    }

    .company-name {
      font-family: 'Outfit', sans-serif;
      font-size: 11pt;
      font-weight: 800;
      margin: 0 0 2mm 0;
      color: #1a1a1a;
    }

    .company-details {
      font-size: 7pt;
      margin: 1mm 0;
      line-height: 1.3;
      color: #333;
    }

    .center-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5mm;
    }

    .logo {
      padding: 4mm 10mm;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #000;
    }

    .logo-text {
      font-family: 'Outfit', sans-serif;
      font-size: 26pt;
      font-weight: 600; /* Choosing a not so bold character as requested by the user */
      margin: 0;
      letter-spacing: 5px;
      text-transform: uppercase;
      color: #000;
    }

    .location {
      text-align: center;
      font-weight: bold;
      font-size: 9pt;
      border: 1px solid #000;
      padding: 2.5mm 6mm;
    }

    .arabic-info {
      text-align: right;
      direction: rtl;
    }

    .arabic-text {
      font-size: 9.5pt;
      font-weight: bold;
      margin: 1mm 0;
    }

    .arabic-details {
      font-size: 7pt;
      margin: 1mm 0;
    }

    .original-label {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 5mm;
      border: 2px solid #000;
      padding: 1.5mm 4mm;
      display: inline-block;
      text-align: center;
    }

    .document-header {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 8mm;
      margin-bottom: 4mm;
    }

    .document-title-section {
      text-align: center;
      border: 2px solid #000;
      padding: 4mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .document-title {
      font-family: 'Outfit', sans-serif;
      font-size: 13pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }

    .client-info {
      border: 1px solid #000;
      padding: 3mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .info-row {
      display: flex;
      gap: 3mm;
      margin-bottom: 1.5mm;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-row .label {
      font-weight: bold;
      min-width: 22mm;
    }

    .info-row .value {
      flex: 1;
    }

    .document-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4mm;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2mm 0;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      border-right: 1px solid #000;
      padding: 1mm 2mm;
    }

    .detail-item:last-child {
      border-right: none;
    }

    .detail-label {
      font-size: 8pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }

    .detail-value {
      font-size: 9.5pt;
      font-weight: bold;
    }

    .items-table-container {
      margin-bottom: 4mm;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }

    .items-table th {
      border: 1px solid #000;
      padding: 2mm;
      font-size: 7.5pt;
      font-weight: bold;
      text-align: center;
      background-color: #fafafa !important;
    }

    .items-table td {
      border: 1px solid #000;
      padding: 1.5mm;
      font-size: 8pt;
      text-align: center;
    }

    .col-code { width: 8mm; }
    .col-designation { width: auto; text-align: left !important; }
    .col-unit { width: 10mm; }
    .col-qty { width: 15mm; }
    .col-price { width: 18mm; }
    .col-tva { width: 10mm; }
    .col-rm { width: 10mm; }
    .col-total { width: 22mm; }

    .item-description {
      font-weight: 500;
    }

    .item-lengths-detail {
      font-size: 7pt;
      margin-top: 1mm;
      color: #444;
      display: flex;
      gap: 2mm;
    }

    .lengths-label {
      font-weight: bold;
    }

    .lengths-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5mm;
    }

    .length-item {
      background: #f0f0f0;
      padding: 0.2mm 1mm;
      border-radius: 2px;
      font-family: monospace;
    }

    .empty-row td {
      height: 7mm;
      border-top: none;
      border-bottom: none;
    }

    .empty-row:last-child td {
      border-bottom: 1px solid #000;
    }

    .footer-section {
      display: grid;
      grid-template-columns: 1.8fr 1.2fr;
      gap: 5mm;
      margin-bottom: 4mm;
    }

    .tax-tables {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }

    .tax-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }

    .tax-table th, .tax-table td {
      border: 1px solid #000;
      padding: 1.5mm;
      font-size: 7.5pt;
      text-align: center;
    }

    .tax-table th {
      font-size: 7pt;
      font-weight: bold;
      background-color: #fafafa !important;
    }

    .amount-words {
      grid-column: 1 / 2;
      border: 1px solid #000;
      padding: 2.5mm;
      margin-top: 2.5mm;
    }

    .words-label {
      font-size: 7pt;
      font-weight: bold;
      display: block;
      margin-bottom: 1.5mm;
    }

    .words-value {
      font-size: 8.5pt;
      font-weight: bold;
      line-height: 1.3;
    }

    .totals-column {
      grid-column: 2 / 3;
      grid-row: 1 / 3;
      display: flex;
      flex-direction: column;
      gap: 2mm;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2mm 3mm;
      border: 1px solid #000;
    }

    .total-label {
      font-weight: bold;
      font-size: 8pt;
    }

    .total-value {
      font-size: 9pt;
      font-weight: bold;
      font-family: monospace;
    }

    .total-ttc {
      font-size: 9.5pt;
      padding: 2.5mm 3mm;
      border-width: 2px;
      background-color: #fafafa !important;
    }

    .total-net-payable {
      font-size: 10.5pt;
      padding: 3mm;
      border: 2px double #000;
      background-color: #f0f0f0 !important;
    }

    .signature-section {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0;
      border: 1px solid #000;
      margin-bottom: 4mm;
    }

    .signature-box {
      border-right: 1px solid #000;
      padding: 2mm;
      min-height: 22mm;
      display: flex;
      flex-direction: column;
    }

    .signature-box:last-child {
      border-right: none;
    }

    .signature-label {
      font-size: 7pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 2mm;
    }

    .signature-area {
      flex: 1;
      min-height: 12mm;
    }

    .cin-label {
      font-size: 7pt;
      margin-top: auto;
    }

    .footer-legal {
      margin-top: 2mm;
      border-top: 1px dashed #ccc;
      padding-top: 2mm;
    }

    .legal-text {
      font-size: 6pt;
      margin: 0.8mm 0;
      line-height: 1.25;
      color: #444;
    }

    .agency-info {
      font-size: 6pt;
      margin: 1mm 0 0 0;
      text-align: center;
      font-weight: bold;
      color: #222;
    }

    .stamp-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 4mm;
      margin-bottom: 2mm;
      page-break-inside: avoid;
    }

    .stamp-image {
      max-width: 50mm;
      max-height: 40mm;
      object-fit: contain;
      opacity: 0.9;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        background: #fff !important;
      }
      .print-container {
        padding: 8mm;
      }
    }
  `;
}

/**
 * Return light print styles optimized for continuous-feed dot-matrix printers.
 * Features:
 * - Monospace layout (Courier New) for 80-column printing
 * - No background colors, graphics or heavy solids
 * - Minimalist borders (dashes and hyphens)
 * - Compact heights and narrow margins
 */
export function getLightPrintStyles(): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9.5pt;
      background: #fff !important;
      color: #000;
      line-height: 1.2;
    }

    .print-container {
      width: 100%;
      max-width: 190mm; /* Narrower to fit standard dot-matrix roll */
      margin: 0 auto;
      padding: 5mm;
    }

    .separator {
      margin: 2mm 0;
      border-bottom: 1px dashed #000;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2mm;
    }

    .company-info {
      width: 60%;
    }

    .company-name {
      font-size: 11pt;
      font-weight: bold;
    }

    .company-details {
      font-size: 8pt;
      margin: 0.5mm 0;
    }

    .arabic-info {
      width: 40%;
      text-align: right;
      direction: rtl;
    }

    .arabic-text {
      font-size: 9pt;
      font-weight: bold;
    }

    .arabic-details {
      font-size: 7.5pt;
    }

    .document-type-header {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      padding: 1mm;
      border: 1px dashed #000;
      margin: 2mm 0;
    }

    .meta-and-client {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2mm;
      font-size: 9pt;
    }

    .meta-box {
      width: 45%;
    }

    .client-box {
      width: 50%;
      border-left: 1px dashed #000;
      padding-left: 3mm;
    }

    .info-row {
      margin-bottom: 1mm;
    }

    .info-label {
      font-weight: bold;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3mm 0;
    }

    .items-table th {
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 1.5mm 1mm;
      font-size: 8.5pt;
      font-weight: bold;
      text-align: right;
    }

    .items-table th.col-designation,
    .items-table td.col-designation {
      text-align: left;
    }

    .items-table th.col-code,
    .items-table td.col-code {
      text-align: center;
    }

    .items-table td {
      padding: 1mm;
      font-size: 8.5pt;
      vertical-align: top;
      text-align: right;
    }

    .item-row {
      border-bottom: 1px dotted #ccc;
    }

    .col-code { width: 6%; }
    .col-designation { width: 44%; }
    .col-unit { width: 8%; text-align: center !important; }
    .col-qty { width: 10%; }
    .col-price { width: 11%; }
    .col-tva { width: 6%; text-align: center !important; }
    .col-total { width: 15%; }

    .item-lengths-detail {
      font-size: 7.5pt;
      color: #333;
      margin-top: 0.5mm;
    }

    .lengths-wrap {
      display: inline-block;
    }

    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 35mm;
    }

    .words-and-legal {
      width: 60%;
      font-size: 8pt;
    }

    .words-label {
      font-weight: bold;
      text-decoration: underline;
    }

    .words-value {
      font-weight: bold;
      margin-top: 1mm;
    }

    .totals-box {
      width: 38%;
      font-size: 9pt;
      border-top: 1px dashed #000;
      padding-top: 1mm;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
    }

    .total-row.highlight {
      font-weight: bold;
      border-top: 1px dotted #000;
      border-bottom: 1px dotted #000;
      padding: 0.5mm 0;
    }

    .total-row.payable {
      font-size: 10.5pt;
      font-weight: bold;
      border: 1px dashed #000;
      padding: 1mm;
      margin-top: 1mm;
    }

    .signatures {
      margin-top: 6mm;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
    }

    .sig-box {
      width: 18%;
      border: 1px dotted #000;
      padding: 1mm;
      height: 15mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sig-label {
      font-weight: bold;
      text-align: center;
    }

    .footer-legal-light {
      margin-top: 4mm;
      font-size: 7pt;
      text-align: center;
      border-top: 1px dashed #000;
      padding-top: 1mm;
    }

    @media print {
      @page {
        margin: 5mm;
      }
      body {
        background: #fff !important;
      }
    }
  `;
}

/**
 * Return A4 styles optimized for Account Statements (État de Compte).
 */
export function getAccountStatementPrintStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Outfit:wght@400;600;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff !important; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-container { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; font-size: 8pt; }
    .header { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10mm; margin-bottom: 8mm; padding-bottom: 5mm; border-bottom: 1px solid #000; }
    .company-name { font-family: 'Outfit', sans-serif; font-size: 11pt; font-weight: 800; margin: 0 0 2mm 0; }
    .company-details { font-size: 7pt; margin: 1mm 0; line-height: 1.3; }
    .center-section { display: flex; flex-direction: column; align-items: center; gap: 5mm; }
    .logo { padding: 4mm 10mm; display: flex; align-items: center; justify-content: center; border: 2px solid #000; }
    .location { text-align: center; font-weight: bold; font-size: 9pt; border: 1px solid #000; padding: 2.5mm 6mm; }
    .arabic-info { text-align: right; direction: rtl; }
    .arabic-text { font-size: 9.5pt; font-weight: bold; margin: 1mm 0; }
    .arabic-details { font-size: 7pt; margin: 1mm 0; }
    .original-label { font-size: 11pt; font-weight: bold; margin-top: 5mm; border: 2px solid #000; padding: 1.5mm 4mm; display: inline-block; text-align: center; }
    .document-header { display: grid; grid-template-columns: 1.2fr 1fr; gap: 8mm; margin-bottom: 4mm; }
    .document-title-section { text-align: center; border: 2px solid #000; padding: 4mm; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .document-title { font-family: 'Outfit', sans-serif; font-size: 13pt; font-weight: bold; text-transform: uppercase; }
    .client-info { border: 1px solid #000; padding: 3mm; display: flex; flex-direction: column; justify-content: center; }
    .info-row { display: flex; gap: 3mm; margin-bottom: 1.5mm; }
    .info-row .label { font-weight: bold; min-width: 22mm; }
    .ledger-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 4mm; }
    .ledger-table th { border: 1px solid #000; padding: 2mm; font-size: 7.5pt; font-weight: bold; text-align: center; background-color: #f0fdf4 !important; color: #064e3b; }
    .ledger-table td { border: 1px solid #000; padding: 1.5mm; font-size: 8pt; text-align: center; }
    .col-date { width: 15%; }
    .col-type { width: 20%; text-align: left !important; }
    .col-desc { width: 30%; text-align: left !important; }
    .col-debit, .col-credit, .col-balance { width: 11.6%; text-align: right !important; }
    .row-debit td { background-color: #fff1f2 !important; }
    .row-credit td { background-color: #ecfdf5 !important; }
    .empty-row td { height: 6mm; border-top: none; border-bottom: none; background-color: transparent !important; }
    .empty-row:last-child td { border-bottom: 1px solid #000; }
    .footer-legal { margin-top: 4mm; border-top: 1px dashed #ccc; padding-top: 2mm; text-align: center; }
    .legal-text { font-size: 6pt; margin: 0.8mm 0; line-height: 1.25; color: #444; }
    .agency-info { font-size: 6pt; margin: 1mm 0 0 0; font-weight: bold; color: #222; }
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; padding: 0; background: #fff !important; }
      .print-container { padding: 8mm; }
      thead { display: table-header-group; }
    }
  `;
}


/**
 * Returns CSS optimised for printing a Tunisian Lettre de Change (Bill of Exchange).
 * During printing, it produces a completely blank A4 landscape sheet where only the
 * text values are printed, aligned with the custom offset calibration values.
 */
export function getTraitePrintStyles(offsetX: number = 0, offsetY: number = 0): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #fff;
      color: #000;
    }

    .traite-container {
      width: 176.5mm;
      height: 115.2mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }

    /* Screen replica style */
    .mock-element {
      font-family: 'Inter', sans-serif;
    }

    .print-value {
      position: absolute;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      font-weight: 700;
      color: #000;
      white-space: pre-wrap;
      line-height: 1.2;
    }

    @media print {
      @page {
        size: 176.5mm 115.2mm;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        background: transparent !important;
      }
      .traite-container {
        width: 176.5mm !important;
        height: 115.2mm !important;
        position: relative !important;
        background: transparent !important;
        transform: translate(${offsetX}mm, ${offsetY}mm) !important;
        transform-origin: top left !important;
      }
      /* Hide all helper elements of the layout */
      .mock-element {
        display: none !important;
      }
      /* Only values print */
      .print-value {
        color: #000 !important;
        visibility: visible !important;
        display: block !important;
      }
    }
  `;
}

/**
 * Return CSS print styles for 1/2 A4 portrait (A5 portrait).
 * Used for Remise de Caisse and Règlement Fournisseur.
 */
export function getHalfA4PrintStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@500;700;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A5 portrait;
      margin: 6mm;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, sans-serif;
      background: #fff !important;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .half-a4-container {
      width: 136mm;
      min-height: 198mm;
      margin: 0 auto;
      padding: 8mm;
      background: #fff !important;
      font-size: 8.5pt;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .half-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4mm;
      margin-bottom: 5mm;
    }

    .half-title-badge {
      text-align: right;
    }

    .half-doc-title {
      font-family: 'Outfit', sans-serif;
      font-size: 13pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }

    .half-doc-ref {
      font-family: monospace;
      font-size: 9pt;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
    }

    .half-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
      margin-bottom: 5mm;
    }

    .half-info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 3mm;
    }

    .half-info-label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }

    .half-info-value {
      font-size: 8.5pt;
      font-weight: 600;
      color: #0f172a;
    }

    .half-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
      font-size: 8pt;
    }

    .half-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7.5pt;
      padding: 2.5mm 3mm;
      border: 1px solid #cbd5e1;
      text-align: left;
    }

    .half-table td {
      padding: 2.5mm 3mm;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }

    .half-total-box {
      background: #f8fafc;
      border: 2px solid #0f172a;
      border-radius: 6px;
      padding: 4mm;
      margin-bottom: 5mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .half-total-words {
      font-size: 8pt;
      font-style: italic;
      color: #334155;
      margin-top: 2mm;
    }

    .half-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10mm;
      margin-top: 6mm;
      padding-top: 4mm;
      border-top: 1px solid #e2e8f0;
    }

    .half-sig-box {
      text-align: center;
    }

    .half-sig-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 12mm;
    }

    @media print {
      body {
        background: transparent !important;
      }
      .half-a4-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
      }
    }
  `;
}

/**
 * Return CSS print styles for Bordereau de Versement (Chèque & Traite)
 * Duplicated twice on a single A4 portrait page.
 */
export function getDuplicatedBordereauPrintStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@500;700;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4 portrait;
      margin: 6mm;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, sans-serif;
      background: #fff !important;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .a4-duplicated-page {
      width: 198mm;
      height: 284mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fff;
    }

    .bordereau-copy-box {
      height: 136mm;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 4mm 5mm;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 8pt;
    }

    .bordereau-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 3mm;
      margin-bottom: 3mm;
    }

    .bordereau-title {
      font-family: 'Outfit', sans-serif;
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.3px;
    }

    .bordereau-bank-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2mm 3mm;
      border-radius: 4px;
      text-align: right;
    }

    .bordereau-bank-name {
      font-weight: 800;
      font-size: 9pt;
      color: #0f172a;
    }

    .bordereau-bank-code {
      font-family: monospace;
      font-size: 8pt;
      color: #475569;
    }

    .bordereau-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3mm;
      font-size: 7.5pt;
    }

    .bordereau-table th {
      background: #f8fafc;
      color: #1e293b;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7pt;
      padding: 2mm 2.5mm;
      border: 1px solid #cbd5e1;
      text-align: left;
    }

    .bordereau-table td {
      padding: 1.8mm 2.5mm;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }

    .bordereau-footer-grid {
      display: grid;
      grid-template-columns: 1.8fr 1fr;
      gap: 4mm;
      align-items: flex-start;
    }

    .bordereau-total-card {
      background: #f8fafc;
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      padding: 2.5mm 3.5mm;
    }

    .bordereau-cut-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 2mm 0;
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 2px;
      border-top: 1.5px dashed #94a3b8;
      padding-top: 2px;
    }

    @media print {
      body {
        background: transparent !important;
      }
      .a4-duplicated-page {
        width: 100% !important;
        height: 100% !important;
      }
    }
  `;
}

/**
 * Return CSS print styles for Stock Labels (A4 / 2 Labels per Page).
 */
export function getStockPrintStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@500;700;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4 portrait;
      margin: 5mm;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, sans-serif;
      background: #fff !important;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .stock-a4-page {
      width: 198mm;
      height: 284mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fff;
    }

    .stock-label-box {
      height: 136mm;
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 5mm 6mm;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 8.5pt;
      overflow: hidden;
    }

    .label-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 2.5mm;
      margin-bottom: 3mm;
    }

    .company-name-title {
      font-family: 'Outfit', sans-serif;
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }

    .depot-subtitle {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 1px;
    }

    .label-badge-box {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .label-badge-title {
      background: #0f172a;
      color: #fff;
      font-size: 7pt;
      font-weight: 800;
      padding: 1.5px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .label-copy-tag {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }

    .main-stock-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 3mm 4mm;
      margin-bottom: 3mm;
    }

    .stock-field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5mm 4mm;
    }

    .stock-field-col {
      display: flex;
      flex-direction: column;
    }

    .stock-field-col.span-2 {
      grid-column: span 2;
    }

    .field-label {
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 1px;
    }

    .field-value-ref {
      font-family: monospace;
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
    }

    .field-value-desc {
      font-size: 9pt;
      font-weight: 600;
      color: #334155;
      line-height: 1.2;
    }

    .field-value-pack {
      font-family: monospace;
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }

    .field-value-qty {
      font-family: monospace;
      font-size: 11pt;
      font-weight: 800;
      color: #059669;
    }

    .unit-tag {
      font-family: sans-serif;
      font-size: 8pt;
      font-weight: 600;
      color: #475569;
      margin-left: 2px;
    }

    .wood-details-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .wood-specs-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2mm;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2mm 3mm;
      margin-bottom: 2.5mm;
    }

    .wood-spec-item {
      display: flex;
      flex-direction: column;
    }

    .spec-label {
      font-size: 6pt;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
    }

    .spec-val {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
    }

    .wood-lengths-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
    }

    .wood-lengths-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 800;
      font-size: 6.5pt;
      text-transform: uppercase;
      padding: 1.5mm 2mm;
      border: 1px solid #cbd5e1;
      text-align: left;
    }

    .wood-lengths-table td {
      padding: 1.2mm 2mm;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }

    .sub-dim {
      font-size: 6.5pt;
      color: #64748b;
      margin-left: 4px;
    }

    .text-more {
      font-size: 7pt;
      color: #64748b;
      padding: 1mm !important;
    }

    .stock-cut-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 1.5mm 0;
      font-size: 7pt;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 1.5px;
      border-top: 1.5px dashed #94a3b8;
      padding-top: 2px;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
    .font-italic { font-style: italic; }

    @media print {
      body {
        background: transparent !important;
      }
      .stock-a4-page {
        width: 100% !important;
        height: 100% !important;
      }
    }
  `;
}


