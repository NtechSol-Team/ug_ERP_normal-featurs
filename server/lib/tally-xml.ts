/**
 * Tally XML Generation Library
 * Provides functions to generate Tally-compatible XML for Sales and Purchases.
 */

export function generateTallyXML(sales: any[], purchases: any[]) {
    // Basic structure for Tally XML Import
    const xml = `
<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <IMPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Vouchers</REPORTNAME>
                <STATICVARIABLES>
                    <SVCURRENTCOMPANY>Bharat Bhai ERP</SVCURRENTCOMPANY>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA>
                ${(sales || []).map(item => {
        const sale = item.sale || item;
        const customer = item.customer;
        const invNo = sale.invoiceNumber || 'INV-NA';
        const dateStr = new Date(sale.date || Date.now()).toISOString().split('T')[0].replace(/-/g, '');
        const ledgerName = customer?.name || 'Cash Customer';
        const narration = `Cash Sale ${invNo}`;

        return `
                <TALLYMESSAGE>
                    <VOUCHER VCHTYPE="Sales" ACTION="Create">
                        <DATE>${dateStr}</DATE>
                        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
                        <VOUCHERNUMBER>${invNo}</VOUCHERNUMBER>
                        <PARTYLEDGERNAME>${ledgerName}</PARTYLEDGERNAME>
                        <NARRATION>${narration}</NARRATION>
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>${ledgerName}</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                            <AMOUNT>-${Number(sale.totalAmount || 0).toFixed(2)}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>Sales Account</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <AMOUNT>${Number(sale.subtotal || 0).toFixed(2)}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>VAT Output (18%)</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <AMOUNT>${Number(sale.vatAmount || 0).toFixed(2)}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                    </VOUCHER>
                </TALLYMESSAGE>`;
    }).join('')}
                ${(purchases || []).map(item => {
        const purchase = item.purchase || item;
        const supplier = item.supplier;
        const billNo = purchase.billNumber || `PURCH-${purchase.id || 'NA'}`;
        const dateStr = new Date(purchase.date || Date.now()).toISOString().split('T')[0].replace(/-/g, '');
        const ledgerName = supplier?.name || 'Cash Supplier';
        const narration = `Purchase Bill ${billNo}`;

        return `
                <TALLYMESSAGE>
                    <VOUCHER VCHTYPE="Purchase" ACTION="Create">
                        <DATE>${dateStr}</DATE>
                        <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
                        <VOUCHERNUMBER>${billNo}</VOUCHERNUMBER>
                        <PARTYLEDGERNAME>${ledgerName}</PARTYLEDGERNAME>
                        <NARRATION>${narration}</NARRATION>
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>${ledgerName}</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <AMOUNT>${Number(purchase.totalAmount || 0).toFixed(2)}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>Purchase Account</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                            <AMOUNT>-${Number(purchase.subtotal || 0).toFixed(2)}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>VAT Input (18%)</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                            <AMOUNT>-${Number(purchase.vatAmount || 0).toFixed(2)}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                    </VOUCHER>
                </TALLYMESSAGE>`;
    }).join('')}
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>
    `.trim();

    return xml;
}
