import { Component, Input, OnInit } from '@angular/core';
import { Document, DocumentTypes } from '../../components/document';
import { ToWords } from 'to-words';

@Component({
  selector: 'app-supplier-order-print',
  templateUrl: './supplier-order-print.component.html',
  styleUrl: './supplier-order-print.component.css'
})
export class SupplierOrderPrintComponent implements OnInit {
  @Input() document!: Document;
  
  toWords = new ToWords({
    localeCode: 'fr-FR',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
      doNotAddOnly: false,
      currencyOptions: {
        name: 'Dinar',
        plural: 'Dinars',
        symbol: 'TND',
        fractionalUnit: {
          name: 'Millime',
          plural: 'Millimes',
          singular: 'Millime',
          symbol: 'MM'
        }
      }
    }
  });

  companyInfo = {
    name: 'SOCOFEB',
    nameFr: 'STE COMMERCIALE DES FERS ET BOIS',
    address: 'Route de Raouad Km 4 Ariana',
    contact: 'Tél: 71 700 123 / Fax: 71 700 456',
    email: 'contact@socofeb.tn',
    registration: 'M.F: 1234567/A/M/000',
    location: 'Ariana, Tunisie',
    arabicName: 'الشركة التجارية للحديد و الخشب',
    footer: 'SOCOFEB - S.A.R.L au Capital de 1.000.000 TND',
    agencyInfo: 'Agence Ariana: Route de Raouad Km 4'
  };

  amountInWords: string = '';

  ngOnInit(): void {
    if (this.document) {
      this.amountInWords = this.toWords.convert(this.document.total_net_ttc);
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatNumber(num: any): string {
    if (num === null || num === undefined) return '0.000';
    return Number(num).toFixed(3);
  }

  getDocType() {
    return "BON DE COMMANDE FOURNISSEUR";
  }
}
