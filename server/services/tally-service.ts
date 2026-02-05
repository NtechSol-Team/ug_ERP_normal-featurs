import { generateTallyXML } from '../lib/tally-xml';

/**
 * Tally Service
 * Handles business logic for exporting data to Tally ERP.
 */
export class TallyService {
    /**
     * Generates a Tally-compatible XML string for the given sales and purchases.
     * This follows the structure required by Tally ERP for Voucher imports.
     */
    static generateExport(sales: any[], purchases: any[]): string {
        try {
            // We only export 'official' transactions for Tally as per business rules
            const officialSales = sales.filter(s => (s.sale?.type || s.type) === 'official');
            const officialPurchases = purchases.filter(p => (p.purchase?.type || p.type) === 'official');

            return generateTallyXML(officialSales, officialPurchases);
        } catch (error) {
            console.error('Error in TallyService.generateExport:', error);
            throw new Error('Failed to generate Tally export');
        }
    }
}
