import { Component, Input, OnInit } from '@angular/core';
import { Document } from '../../components/document';
import { numberToFrenchWords } from '../../../utils/number-to-words.util';

@Component({
    selector: 'app-delivery-note-print',
    templateUrl: './delivery-note-print.component.html',
    styleUrls: ['./delivery-note-print.component.css']
})
export class DeliveryNotePrintComponent implements OnInit {
    private _document: Document | null = null;
    @Input() set document(value: Document | null) {
        this._document = value;
        if (value) {
            this.generateBarcode();
            this.calculateAmountInWords();
        }
    }
    get document(): Document | null {
        return this._document;
    }

    // Company information - COTUB
    companyInfo = {
        name: 'Société Commerciale du Fer et du Bois',
        nameFr: 'S.A. au Capital de 20.000 DT',
        arabicName: 'الشركة التجارية للحديد و الخشب',
        arabicCapital: 'شركة خفية الإسم رأس مالها20.000',
        address: 'Siège Social: Rte de Raoued Km 4 - 2080 Ariana',
        contact: 'Tél.: 98 360 569 | 99 218 866 ',
        ccb: 'CCB: BNA Raoued 03 023 151 0115 004089 24',
        email: 'E-mail: socofeb.deco@gmail.com',
        registration: 'Route de Raoued Km 4 - 2080 Ariana',
        phone: 'Tél: 98 360 569 | 99 218 866',
        location: 'ARIANA Cité el ghazela',
        footer: 'Ce bon de livraison doit être signé pour réalisation ou la marchandise livrée est de de la société ne peut garantir la décoloration de la marchandise et de l\'aspect extérieur. Toutefois la garantie est limitée aux éventuels défauts que si la feuille est dans le délai d\'un an à par surcpaquage/désemballage selon un délai évenu tel que les agressions climatiques, et présent en un transport ou qui ne résultent pas lesdits problèmes Ni quittes pour les agression climatiques.',
        agencyInfo: 'Agence: Cité el ghazela - Tél : 99 218 760 / Sidi Amor - Tél : 99 218 762 R.C. 456545185151P : TVA :0040863P A/M/M000'
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
        this.barcodeValue = this.document?.docnumber || '';
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
        this.amountInWords = numberToFrenchWords(amount);
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
