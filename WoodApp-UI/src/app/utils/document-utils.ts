import { BillingStatus, DocStatus, DocStatus_FR } from '../models/components/document';

export interface StatusInfo {
    text: string;
    color: string;
    bgColor?: string;
}

/**
 * Returns text and color coding for document status
 */
export function getStatusInfo(status: DocStatus): StatusInfo {
    switch (status) {
        case DocStatus.Delivered: return { text: DocStatus_FR.Delivered, color: '#2e7d32', bgColor: '#e8f5e9' };
        case DocStatus.Abandoned: return { text: DocStatus_FR.Abandoned, color: '#c62828', bgColor: '#ffebee' };
        case DocStatus.Created: return { text: DocStatus_FR.Created, color: '#1565c0', bgColor: '#e3f2fd' };
        case DocStatus.Deleted: return { text: DocStatus_FR.Deleted, color: '#37474f', bgColor: '#eceff1' };
        case DocStatus.NotDelivered: return { text: DocStatus_FR.NotDelivered, color: '#ef6c00', bgColor: '#fff3e0' };
        case DocStatus.NotConfirmed: return { text: DocStatus_FR.NotConfirmed, color: '#f9a825', bgColor: '#fffde7' };
        case DocStatus.Confirmed: return { text: DocStatus_FR.Confirmed, color: '#2e7d32', bgColor: '#e8f5e9' };
        default: return { text: 'Inconnu', color: '#37474f', bgColor: '#eceff1' };
    }
}

/**
 * Returns text and color coding for billing status
 */
export function getBillingStatusInfo(status: BillingStatus): StatusInfo {
    switch (status) {
        case BillingStatus.NotBilled: return { text: 'Non Payé', color: '#d84315', bgColor: '#fbe9e7' };
        case BillingStatus.Billed: return { text: 'Payé', color: '#2e7d32', bgColor: '#e8f5e9' };
        case BillingStatus.PartiallyBilled: return { text: 'Partiellement Payé', color: '#f9a825', bgColor: '#fffde7' };
        default: return { text: 'Non Payé', color: '#d84315', bgColor: '#fbe9e7' };
    }
}

/**
 * Checks if two dates are the same day (ignoring time)
 */
export function isSameDay(d1: Date | string, d2: Date | string): boolean {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

/**
 * Gets the month index (0-11) from a month name using a months map
 */
export function getMonthIndex(monthName: string, monthsMap: any): number {
    return Number(
        Object.keys(monthsMap).find(key =>
            monthsMap[key as any] === monthName
        ) || 1
    ) - 1;
}
