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
      margin-top: 2mm;
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

