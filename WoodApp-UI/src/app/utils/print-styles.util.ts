export function getSharedPrintStyles(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
      /* Print Styles for COTUB Delivery Note & Invoices */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
      }

      .delivery-note-container {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 10mm;
        background: #e8f5e9 !important;
        font-size: 9pt;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .header {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 10mm;
        margin-bottom: 8mm;
        padding-bottom: 5mm;
        border-bottom: 1px solid #000;
      }

      .company-info { text-align: left; }
      .company-name {
        font-size: 11pt;
        font-weight: bold;
        margin: 0 0 2mm 0;
      }
      .company-details {
        font-size: 7pt;
        margin: 1mm 0;
        line-height: 1.3;
      }

      .center-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5mm;
      }

      .logo {
        width: 60mm;
        height: 20mm;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #000;
      }

      .logo-text {
        font-size: 32pt;
        font-weight: bold;
        margin: 0;
        letter-spacing: 3px;
      }

      .location {
        text-align: center;
        font-weight: bold;
        font-size: 10pt;
        border: 1px solid #000;
        padding: 3mm 8mm;
      }

      .arabic-info {
        text-align: right;
        direction: rtl;
      }

      .arabic-text {
        font-size: 10pt;
        font-weight: bold;
        margin: 1mm 0;
      }

      .arabic-details {
        font-size: 7pt;
        margin: 1mm 0;
      }

      .original-label {
        font-size: 12pt;
        font-weight: bold;
        margin-top: 5mm;
        border: 2px solid #000;
        padding: 2mm 5mm;
        display: inline-block;
      }

      .document-header {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10mm;
        margin-bottom: 3mm;
      }

      .document-title-section {
        text-align: center;
        border: 2px solid #000;
        padding: 3mm;
      }

      .document-title {
        font-size: 14pt;
        font-weight: bold;
        margin: 0;
      }

      .document-subtitle {
        font-size: 12pt;
        font-weight: bold;
        margin: 2mm 0 0 0;
      }

      .client-info {
        border: 1px solid #000;
        padding: 3mm;
      }

      .info-row {
        display: flex;
        gap: 5mm;
        margin-bottom: 2mm;
      }

      .info-row .label {
        font-weight: bold;
        min-width: 20mm;
      }

      .document-details {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3mm;
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

      .detail-item:last-child { border-right: none; }

      .detail-label {
        font-size: 8pt;
        font-weight: bold;
        margin-bottom: 1mm;
      }

      .barcode-section {
        text-align: center;
        margin: 3mm 0;
        height: 15mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .barcode-text {
        font-family: 'Courier New', monospace;
        font-size: 14pt;
        font-weight: bold;
        letter-spacing: 2px;
      }

      .region-info {
        display: flex;
        justify-content: flex-end;
        gap: 20mm;
        margin-bottom: 3mm;
      }

      .tva-label { font-weight: bold; font-size: 8pt; }

      .items-table-container { margin-bottom: 3mm; }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
      }

      .items-table th {
        border: 1px solid #000;
        padding: 2mm;
        font-size: 7pt;
        font-weight: bold;
        text-align: center;
      }

      .items-table td {
        border: 1px solid #000;
        padding: 1.5mm;
        font-size: 8pt;
        text-align: center;
      }

      .col-code { width: 25mm; }
      .col-designation { width: auto; text-align: left !important; }
      .col-unit { width: 10mm; }
      .col-qty { width: 15mm; }
      .col-price { width: 18mm; }
      .col-tva { width: 10mm; }
      .col-rm { width: 10mm; }
      .col-total { width: 22mm; }

      .empty-row td {
        height: 8mm;
        border-top: none;
        border-bottom: none;
      }

      .empty-row:last-child td { border-bottom: 1px solid #000; }

      .footer-section {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 5mm;
        margin-bottom: 3mm;
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
        font-size: 8pt;
        text-align: center;
      }

      .tax-table th {
        font-size: 7pt;
        font-weight: bold;
      }

      .amount-words {
        grid-column: 1 / 2;
        border: 1px solid #000;
        padding: 3mm;
        margin-top: 2mm;
      }

      .words-label {
        font-size: 7pt;
        font-weight: bold;
        display: block;
        margin-bottom: 2mm;
      }

      .words-value {
        font-size: 9pt;
        font-weight: bold;
        min-height: 10mm;
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
        padding: 2mm 3mm;
        border: 1px solid #000;
      }

      .total-label { font-weight: bold; font-size: 8pt; }
      .total-value { font-size: 9pt; font-weight: bold; }
      .total-ttc { font-size: 10pt; padding: 3mm; }

      .signature-section {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0;
        border: 1px solid #000;
        margin-bottom: 3mm;
      }

      .signature-box {
        border-right: 1px solid #000;
        padding: 2mm;
        min-height: 20mm;
        display: flex;
        flex-direction: column;
      }

      .signature-box:last-child { border-right: none; }

      .signature-label {
        font-size: 7pt;
        font-weight: bold;
        text-align: center;
        margin-bottom: 2mm;
      }

      .signature-area {
        flex: 1;
        min-height: 15mm;
      }

      .cin-label {
        font-size: 7pt;
        margin-top: auto;
      }

      .footer-legal { margin-top: 3mm; }

      .legal-text {
        font-size: 6pt;
        margin: 1mm 0;
        line-height: 1.2;
      }

      .agency-info {
        font-size: 6pt;
        margin: 1mm 0;
        text-align: center;
        font-weight: bold;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }

        body { margin: 0; padding: 0; }

        .delivery-note-container {
          background: #e8f5e9 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
}
