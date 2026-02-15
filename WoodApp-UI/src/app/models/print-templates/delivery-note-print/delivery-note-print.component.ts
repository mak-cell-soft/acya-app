import { Component, Input, OnInit } from '@angular/core';
import { Document } from '../../components/document';

@Component({
    selector: 'app-delivery-note-print',
    templateUrl: './delivery-note-print.component.html',
    styleUrls: ['./delivery-note-print.component.css']
})
export class DeliveryNotePrintComponent implements OnInit {
    @Input() document!: Document;

    // Company information - COTUB
    companyInfo = {
        name: 'COMPTOIR TUNISIEN DE BATIMENT',
        nameFr: 'S.A. au Capital de 14.625.000 DT',
        arabicName: 'المصرف التونسي للبناء',
        arabicCapital: 'شركة خفية الإسم رأس مالها 14.625.000',
        address: 'Siège Social: Rte de Tunis km 0.5 - 3002 Sfax',
        contact: 'Tél.: 74 235 225 - Fax.: 74 235 363\nTél.: 74 487 555 - Fax.: 74 487 544',
        ccb: 'CCB: BT SFAX 05 700 0000 19 3020 45 391',
        email: 'E-mail: commercial@cotub.com.tn',
        registration: 'Z.I CHARGUIA | 2035 Tunis',
        phone: 'Tél: 71 807 655-Fax :71 794 974',
        location: 'TUNIS\nBORJ TOUIL',
        footer: 'Ce bon de livraison doit être signé pour réalisation ou la marchandise livrée est de de la société ne peut garantir la décoloration de la marchandise et de l\'aspect extérieur. Toutefois la garantie est limitée aux éventuels défauts que si la feuille est dans le délai d\'un an à par surcpaquage/désemballage selon un délai évenu tel que les agressions climatiques, et présent en un transport ou qui ne résultent pas lesdits problèmes Ni quittes pour les agression climatiques.',
        agencyInfo: 'Agence: Charguia | Tunis - Tél : 71 807 655/ Borj Touil Ariana - Tél : 71 780 903 R.C. : B 177791996 Code en Douane :220.111.8 TVA :0023755 C/A/M000'
    };

    // Generated data
    barcodeValue: string = '';
    amountInWords: string = '';

    ngOnInit(): void {
        this.generateBarcode();
        this.calculateAmountInWords();
    }

    /**
     * Generate barcode value from document number
     */
    generateBarcode(): void {
        // Simple barcode generation - can be enhanced with actual barcode library
        this.barcodeValue = this.document.docnumber || '';
    }

    /**
     * Format date to DD/MM/YY
     */
    formatDate(date: Date | string | undefined): string {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    /**
     * Format number to Tunisian format (e.g., 219,538)
     */
    formatNumber(value: number | undefined): string {
        if (value === undefined || value === null) return '0,000';
        return value.toFixed(3).replace('.', ',');
    }

    /**
     * Convert numeric amount to French words
     * This is a simplified version - enhance for full Tunisian Dinar conversion
     */
    calculateAmountInWords(): void {
        const amount = this.document?.total_net_ttc || 0;
        this.amountInWords = this.numberToFrenchWords(amount);
    }

    /**
     * Convert number to French words (Tunisian Dinar format)
     */
    private numberToFrenchWords(amount: number): string {
        const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
        const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
        const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];
        const hundreds = ['', 'CENT', 'DEUX CENT', 'TROIS CENT', 'QUATRE CENT', 'CINQ CENT', 'SIX CENT', 'SEPT CENT', 'HUIT CENT', 'NEUF CENT'];

        const dinars = Math.floor(amount);
        const millimes = Math.round((amount - dinars) * 1000);

        let result = '';

        // Convert dinars
        if (dinars === 0) {
            result = 'ZERO DINAR';
        } else {
            // Thousands
            const thousands = Math.floor(dinars / 1000);
            const remainder = dinars % 1000;

            if (thousands > 0) {
                if (thousands === 1) {
                    result += 'MILLE ';
                } else {
                    result += this.convertHundreds(thousands) + ' MILLE ';
                }
            }

            if (remainder > 0) {
                result += this.convertHundreds(remainder) + ' ';
            }

            result += dinars > 1 ? 'DINARS' : 'DINAR';
        }

        // Convert millimes
        if (millimes > 0) {
            result += ' ' + this.convertHundreds(millimes) + ' MILLIMES';
        }

        return result.trim();
    }

    private convertHundreds(num: number): string {
        const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
        const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
        const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

        let result = '';
        const hundredsDigit = Math.floor(num / 100);
        const remainder = num % 100;

        if (hundredsDigit > 0) {
            if (hundredsDigit === 1) {
                result += 'CENT ';
            } else {
                result += units[hundredsDigit] + ' CENT ';
            }
        }

        if (remainder >= 10 && remainder < 20) {
            result += teens[remainder - 10];
        } else {
            const tensDigit = Math.floor(remainder / 10);
            const unitsDigit = remainder % 10;

            if (tensDigit > 0) {
                result += tens[tensDigit];
                if (unitsDigit > 0) {
                    result += ' ' + units[unitsDigit];
                }
            } else if (unitsDigit > 0) {
                result += units[unitsDigit];
            }
        }

        return result.trim();
    }

    /**
     * Calculate TVA breakdown for footer table
     */
    getTvaBreakdown(): Array<{ base: number; percentage: number; value: number }> {
        const breakdown: { [key: number]: { base: number; value: number } } = {};

        this.document?.merchandises?.forEach(merch => {
            const tvaRate = merch.article?.tva?.value || 0;
            const base = merch.cost_net_ht || 0;
            const tvaValue = merch.tva_value || 0;

            if (!breakdown[Number(tvaRate)]) {
                breakdown[Number(tvaRate)] = { base: 0, value: 0 };
            }

            breakdown[Number(tvaRate)].base += base;
            breakdown[Number(tvaRate)].value += tvaValue;
        });

        return Object.keys(breakdown).map(rate => {
            const numRate = Number(rate);
            return {
                base: breakdown[numRate].base,
                percentage: numRate,
                value: breakdown[numRate].value
            };
        });
    }

    /**
     * Get client display name
     */
    getClientName(): string {
        const cp = this.document?.counterpart;
        if (!cp) return '';
        return cp.name || `${cp.firstname} ${cp.lastname}`.trim();
    }

    /**
     * Get client address
     */
    getClientAddress(): string {
        return this.document?.counterpart?.address || '';
    }

    /**
     * Get TVA code
     */
    getTvaCode(): string {
        return this.document?.counterpart?.taxregistrationnumber || '';
    }

    /**
     * Get gouvernorate/region
     */
    getGovernorate(): string {
        return this.document?.counterpart?.gouvernorate || '';
    }

    /**
     * Get account number - for now using counterpart ID
     */
    getAccountNumber(): string {
        return this.document?.counterpart?.id?.toString() || '';
    }
}
