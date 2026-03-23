import { Component, Input, OnInit } from '@angular/core';
import { StockTransferDetails, StockTransferInfo, TransferStatus_FR } from '../../components/stock_transfert';

@Component({
    selector: 'app-stock-transfer-print',
    templateUrl: './stock-transfer-print.component.html',
    styleUrls: ['./stock-transfer-print.component.css']
})
export class StockTransferPrintComponent implements OnInit {
    /**
     * The stock transfer summary information
     */
    @Input() transfer: StockTransferInfo | null = null;
    
    /**
     * Detailed merchandise items for this transfer
     */
    @Input() details: StockTransferDetails[] = [];

    /**
     * Optional confirmation code for validated transfers
     */
    @Input() confirmationCode: string = '';

    // Company information - COTUB (Consistent with other print templates)
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
        footer: 'Ce bon de transfert doit être accompagné des documents de transport réglementaires. La marchandise reste la propriété de la société jusqu\'à réception confirmée par le destinataire.',
        agencyInfo: 'Agence: Cité el ghazela - Tél : 99 218 760 / Sidi Amor - Tél : 99 218 762 R.C. 456545185151P : TVA :0040863P A/M/M000'
    };

    ngOnInit(): void {
    }

    /**
     * Format date to a readable format
     */
    formatDate(date: Date | string | undefined): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format number to Tunisian decimal format
     */
    formatNumber(value: number | undefined): string {
        if (value === undefined || value === null) return '0,000';
        return value.toFixed(3).replace('.', ',');
    }

    /**
     * Get the human-readable status in French
     */
    getStatusLabel(): string {
        if (!this.transfer) return '';
        const statusMap: any = TransferStatus_FR;
        // The transfer.status is an enum/number, we need to map it if needed
        // For now using a simple switch if TransferStatus_FR doesn't work directly
        return this.transfer.status ? (statusMap[this.transfer.status] || 'Inconnu') : 'En Attente';
    }

    /**
     * Extracts Vehicle info if it's embedded in the transporter string
     * or returns a placeholder.
     */
    getVehicleInfo(): string {
        if (this.transfer?.vehicleSerialNumber) {
            return this.transfer.vehicleSerialNumber;
        }
        
        // If not in transfer summary, check if any detail has it
        if (this.details && this.details.length > 0 && this.details[0].vehicleSerialNumber) {
            return this.details[0].vehicleSerialNumber;
        }

        return '---'; 
    }
}
