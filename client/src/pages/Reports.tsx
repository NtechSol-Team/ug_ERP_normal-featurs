import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSales, usePurchases, useExpenses, useProducts, useCustomers, useSuppliers } from "@/hooks/use-erp";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
    FileText,
    Lock,
    Download,
    FileJson,
    Calendar as CalendarIcon,
    Info,
    AlertTriangle,
    BarChart4,
    Briefcase,
    TrendingUp,
    Files
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { ViewInvoiceDialog, ViewBillDialog } from "@/components/TransactionDialogs";
import { Printer, FileSpreadsheet } from "lucide-react";

export default function Reports() {
    const { user } = useAuth();
    const isOwner = user?.role === "owner";

    // Data Hooks
    const { data: sales } = useSales();
    const { data: purchases } = usePurchases();
    const { data: expenses } = useExpenses();
    const { data: customers } = useCustomers();
    const { data: suppliers } = useSuppliers();
    const { data: products } = useProducts();

    // Report State
    const [reportType, setReportType] = useState("sales_official");
    const [fromDate, setFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
    const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

    // Tally Export State
    const [exportOpen, setExportOpen] = useState(false);
    const [tallyExportType, setTallyExportType] = useState("complete");

    // Filtering logic
    const filteredSales = sales?.filter(s => {
        const date = new Date(s.sale.date || "");
        return s.sale.type === "official" &&
            date >= new Date(fromDate) &&
            date <= new Date(toDate + "T23:59:59");
    }) || [];

    const totalOfficialSales = filteredSales.reduce((sum: number, s: any) => sum + Number(s.sale.totalAmount), 0);
    const totalVatSales = filteredSales.reduce((sum: number, s: any) => sum + Number(s.sale.vatAmount), 0);
    const totalSubtotalSales = filteredSales.reduce((sum: number, s: any) => sum + Number(s.sale.subtotal), 0);
    const avgInvoiceValue = filteredSales.length > 0 ? totalOfficialSales / filteredSales.length : 0;

    // Filtered Purchases
    const filteredPurchases = purchases?.filter(p => {
        const date = new Date(p.purchase.date || "");
        return p.purchase.type === "official" &&
            date >= new Date(fromDate) &&
            date <= new Date(toDate + "T23:59:59");
    }) || [];

    const totalOfficialPurchases = filteredPurchases.reduce((sum: number, p: any) => sum + Number(p.purchase.totalAmount), 0);
    const totalVatPurchases = filteredPurchases.reduce((sum: number, p: any) => sum + Number(p.purchase.vatAmount), 0);
    const totalSubtotalPurchases = filteredPurchases.reduce((sum: number, p: any) => sum + Number(p.purchase.subtotal), 0);
    const avgBillValue = filteredPurchases.length > 0 ? totalOfficialPurchases / filteredPurchases.length : 0;

    // --- NEW REPORT CALCULATIONS ---

    // Filtered Expenses
    const filteredExpenses = expenses?.filter(e => {
        const date = new Date(e.date || "");
        const matchesType = reportType === "expenses_internal" ? e.type === "internal" : e.type === "official";
        return matchesType &&
            date >= new Date(fromDate) &&
            date <= new Date(toDate + "T23:59:59");
    }) || [];
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Internal Sales (Owner Only)
    const filteredInternalSales = sales?.filter(s => {
        const date = new Date(s.sale.date || "");
        return s.sale.type === "internal" &&
            date >= new Date(fromDate) &&
            date <= new Date(toDate + "T23:59:59");
    }) || [];
    const totalInternalSalesAmount = filteredInternalSales.reduce((sum, s) => sum + Number(s.sale.totalAmount), 0);

    // VAT Report Data
    const vatOutput = filteredSales.reduce((sum, s) => sum + Number(s.sale.vatAmount), 0);
    const vatInput = filteredPurchases.reduce((sum, p) => sum + Number(p.purchase.vatAmount), 0);
    const netVatPayable = vatOutput - vatInput;

    // Accounts Receivable (Simplified: Sum of all official sales per customer)
    const arData = customers?.map(customer => {
        const customerSales = sales?.filter(s => s.sale.customerId === customer.id && s.sale.type === 'official') || [];
        const totalOutstanding = customerSales.reduce((sum, s) => sum + Number(s.sale.totalAmount), 0);
        return { ...customer, totalOutstanding };
    }).filter(c => c.totalOutstanding > 0).sort((a, b) => b.totalOutstanding - a.totalOutstanding) || [];

    // Accounts Payable (Simplified: Sum of all official purchases per supplier)
    const apData = suppliers?.map(supplier => {
        const supplierPurchases = purchases?.filter(p => p.purchase.supplierId === supplier.id && p.purchase.type === 'official') || [];
        const totalOwed = supplierPurchases.reduce((sum, p) => sum + Number(p.purchase.totalAmount), 0);
        return { ...supplier, totalOwed };
    }).filter(s => s.totalOwed > 0).sort((a, b) => b.totalOwed - a.totalOwed) || [];

    // Profit & Loss (Owner Only - Combined)
    const allSales = sales?.filter(s => {
        const date = new Date(s.sale.date || "");
        return date >= new Date(fromDate) && date <= new Date(toDate + "T23:59:59");
    }) || [];
    const allExpenses = expenses?.filter(e => {
        const date = new Date(e.date || "");
        return date >= new Date(fromDate) && date <= new Date(toDate + "T23:59:59");
    }) || [];
    const allPurchases = purchases?.filter(p => {
        const date = new Date(p.purchase.date || "");
        return date >= new Date(fromDate) && date <= new Date(toDate + "T23:59:59");
    }) || [];

    const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.sale.totalAmount), 0);
    const totalCostOfSales = allPurchases.reduce((sum, p) => sum + Number(p.purchase.totalAmount), 0);
    const totalOpExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const grossProfit = totalRevenue - totalCostOfSales;
    const netProfit = grossProfit - totalOpExpenses;

    // Official vs Internal Tracking
    const comparisonData = {
        official: {
            sales: totalOfficialSales,
            expenses: expenses?.filter(e => e.type === 'official').reduce((sum, e) => sum + Number(e.amount), 0) || 0,
            count: filteredSales.length + filteredPurchases.length
        },
        internal: {
            sales: totalInternalSalesAmount,
            expenses: expenses?.filter(e => e.type === 'internal').reduce((sum, e) => sum + Number(e.amount), 0) || 0,
            count: filteredInternalSales.length + (expenses?.filter(e => e.type === 'internal').length || 0)
        }
    };

    // Inventory Data (Using products directly as a snapshot for now)
    const inventoryValue = products?.reduce((sum: number, p: any) => sum + (Number(p.stockQuantity) * Number(p.unitPrice)), 0) || 0;
    const lowStockCount = products?.filter((p: any) => Number(p.stockQuantity) < 10).length || 0;

    const handlePrint = () => {
        window.print();
    };

    const handleExcelExport = () => {
        // Simple CSV export for "Excel"
        const headers = ["Date", "Invoice", "Customer", "Amount", "VAT (18%)", "Total"];
        const rows = filteredSales.map(s => [
            format(new Date(s.sale.date || ""), "dd/MM/yyyy"),
            s.sale.invoiceNumber,
            s.customer?.name || "Cash Customer",
            s.sale.subtotal,
            s.sale.vatAmount,
            s.sale.totalAmount
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sales_report_${fromDate}_to_${toDate}.csv`;
        link.click();
    };

    const handleTallyExport = () => {
        if (!sales || !purchases) return;

        // Robust filtering for official records
        const officialSales = sales.filter(item => {
            const s = item.sale || item;
            return s.type === "official";
        });

        const officialPurchases = purchases.filter(item => {
            const p = item.purchase || item;
            return p.type === "official";
        });

        const xmlContent = generateTallyXML(officialSales, officialPurchases);
        const blob = new Blob([xmlContent], { type: "text/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tally_export_${fromDate}_to_${toDate}.xml`;
        link.click();
        setExportOpen(false);
    };

    return (
        <div className="space-y-8 pb-20 print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
                    <p className="text-muted-foreground">Generate business and tax reports</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4 print:hidden">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Report Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sales_official">Sales Report</SelectItem>
                                    <SelectItem value="purchases_official">Purchases Report</SelectItem>
                                    <SelectItem value="expenses_official">Expenses Report</SelectItem>
                                    <SelectItem value="vat_report">VAT Report</SelectItem>
                                    <SelectItem value="inventory">Inventory Report</SelectItem>
                                    <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                                    <SelectItem value="accounts_payable">Accounts Payable</SelectItem>

                                    {isOwner && (
                                        <>
                                            <Separator className="my-2" />
                                            <SelectItem value="sales_internal" className="text-orange-600 font-semibold">Internal Sales</SelectItem>
                                            <SelectItem value="expenses_internal" className="text-orange-600 font-semibold">Internal Expenses</SelectItem>
                                            <SelectItem value="profit_loss">Combined Profit & Loss</SelectItem>
                                            <SelectItem value="comparison">Official vs Internal</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>From Date</Label>
                            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>To Date</Label>
                            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                        <div className="pt-4 grid gap-2">
                            <Button variant="outline" className="w-full justify-start" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Print Report
                            </Button>
                            <Button variant="outline" className="w-full justify-start" onClick={handleExcelExport}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to Excel
                            </Button>

                            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full justify-start bg-green-700 hover:bg-green-800">
                                        <Download className="mr-2 h-4 w-4" /> Export to Tally
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Export to Tally ERP</DialogTitle>
                                        <DialogDescription>
                                            Generate XML file for official accounting data.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="bg-muted p-4 rounded-md text-sm space-y-2">
                                        <p className="font-semibold flex items-center gap-2">
                                            <Info className="h-4 w-4" /> Export Notice
                                        </p>
                                        <p className="text-muted-foreground">
                                            Exports contain ONLY verified business transactions for accounting and tax compliance.
                                            Non-verified records are excluded from all export files.
                                        </p>
                                    </div>
                                    <div className="py-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Export Type</Label>
                                            <Select value={tallyExportType} onValueChange={setTallyExportType}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="complete">Complete (Masters + Transactions)</SelectItem>
                                                    <SelectItem value="masters">Masters Only</SelectItem>
                                                    <SelectItem value="transactions">Transactions Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
                                        <Button className="bg-green-700 hover:bg-green-800" onClick={handleTallyExport}>Download XML</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle className="text-xl">
                                {reportType === "sales_official" ? "Verified Sales Register" :
                                    reportType === "purchases_official" ? "Verified Purchase Register" :
                                        reportType === "expenses_official" ? "Verified Expense Register" :
                                            reportType === "vat_report" ? "VAT Summary Report" :
                                                reportType === "accounts_receivable" ? "Accounts Receivable (Customer Balances)" :
                                                    reportType === "accounts_payable" ? "Accounts Payable (Supplier Balances)" :
                                                        reportType === "sales_internal" ? "Internal Sales Report" :
                                                            reportType === "expenses_internal" ? "Internal Expenses Report" :
                                                                reportType === "profit_loss" ? "Combined Profit & Loss Statement" :
                                                                    reportType === "comparison" ? "Official vs Internal Comparison" :
                                                                        "Inventory Report (Snapshot)"}
                            </CardTitle>
                            <CardDescription>
                                {reportType === "inventory" ? "Current stock valuation and levels" :
                                    (reportType === "accounts_receivable" || reportType === "accounts_payable") ? "Current outstanding totals based on official records" :
                                        `Period: ${fromDate} to ${toDate}`}
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className={cn(
                            "bg-blue-50 text-blue-700 border-blue-200",
                            (reportType.includes("internal") || reportType === "profit_loss" || reportType === "comparison") && "bg-orange-50 text-orange-700 border-orange-200"
                        )}>
                            {reportType.includes("internal") ? "Internal Records" :
                                (reportType === "profit_loss" || reportType === "comparison") ? "Owner Strategic View" :
                                    "Verified Business Records"}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {reportType === "sales_official" && (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>VAT (18%)</TableHead>
                                            <TableHead>Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSales.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">No transactions found for this period.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSales.map((s) => (
                                                <ViewInvoiceDialog key={s.sale.id} saleData={s}>
                                                    <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                        <TableCell>{format(new Date(s.sale.date || ""), "yyyy-MM-dd")}</TableCell>
                                                        <TableCell className="font-mono text-xs">{s.sale.invoiceNumber}</TableCell>
                                                        <TableCell>
                                                            {s.customer?.name || (
                                                                <div className="flex flex-col leading-tight">
                                                                    <span>Walk-in</span>
                                                                    <span className="text-[10px] text-muted-foreground uppercase opacity-70">Customer</span>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>UGX {Number(s.sale.subtotal).toLocaleString()}</TableCell>
                                                        <TableCell>UGX {Number(s.sale.vatAmount).toLocaleString()}</TableCell>
                                                        <TableCell className="font-semibold">UGX {Number(s.sale.totalAmount).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                </ViewInvoiceDialog>
                                            ))
                                        )}
                                        {filteredSales.length > 0 && (
                                            <TableRow className="bg-muted/50 font-bold">
                                                <TableCell colSpan={3}>TOTALS:</TableCell>
                                                <TableCell>UGX {totalSubtotalSales.toLocaleString()}</TableCell>
                                                <TableCell>UGX {totalVatSales.toLocaleString()}</TableCell>
                                                <TableCell>UGX {totalOfficialSales.toLocaleString()}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Total Invoices</p>
                                        <p className="text-2xl font-bold">{filteredSales.length}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Average Invoice Value</p>
                                        <p className="text-2xl font-bold">UGX {avgInvoiceValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">VAT Collected</p>
                                        <p className="text-2xl font-bold text-blue-600">UGX {totalVatSales.toLocaleString()}</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {isOwner && reportType === "sales_internal" && (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInternalSales.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">No internal sales found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredInternalSales.map((s) => (
                                                <TableRow key={s.sale.id}>
                                                    <TableCell>{format(new Date(s.sale.date || ""), "dd/MM/yyyy")}</TableCell>
                                                    <TableCell className="font-mono text-xs">{s.sale.invoiceNumber}</TableCell>
                                                    <TableCell>{s.customer?.name || "Walk-in Customer"}</TableCell>
                                                    <TableCell className="text-right font-bold">UGX {Number(s.sale.totalAmount).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {filteredInternalSales.length > 0 && (
                                            <TableRow className="bg-orange-50 font-bold">
                                                <TableCell colSpan={3}>TOTAL INTERNAL REVENUE:</TableCell>
                                                <TableCell className="text-right">UGX {totalInternalSalesAmount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </>
                        )}

                        {reportType === "purchases_official" && (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Bill No.</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>VAT (18%)</TableHead>
                                            <TableHead>Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPurchases.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">No purchases found for this period.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPurchases.map((p) => (
                                                <ViewBillDialog key={p.purchase.id} purchaseData={p}>
                                                    <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                        <TableCell>{format(new Date(p.purchase.date || ""), "yyyy-MM-dd")}</TableCell>
                                                        <TableCell className="font-mono text-xs">{p.purchase.billNumber || "PRCH-" + p.purchase.id}</TableCell>
                                                        <TableCell>{p.supplier?.name || "Cash Supplier"}</TableCell>
                                                        <TableCell>UGX {Number(p.purchase.subtotal).toLocaleString()}</TableCell>
                                                        <TableCell>UGX {Number(p.purchase.vatAmount).toLocaleString()}</TableCell>
                                                        <TableCell className="font-semibold">UGX {Number(p.purchase.totalAmount).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                </ViewBillDialog>
                                            ))
                                        )}
                                        {filteredPurchases.length > 0 && (
                                            <TableRow className="bg-muted/50 font-bold">
                                                <TableCell colSpan={3}>TOTALS:</TableCell>
                                                <TableCell>UGX {totalSubtotalPurchases.toLocaleString()}</TableCell>
                                                <TableCell>UGX {totalVatPurchases.toLocaleString()}</TableCell>
                                                <TableCell>UGX {totalOfficialPurchases.toLocaleString()}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Total Bills</p>
                                        <p className="text-2xl font-bold">{filteredPurchases.length}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Average Bill Value</p>
                                        <p className="text-2xl font-bold">UGX {avgBillValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">VAT Input Credit</p>
                                        <p className="text-2xl font-bold text-green-600">UGX {totalVatPurchases.toLocaleString()}</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {reportType === "inventory" && (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Stock Qty</TableHead>
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead>Valuation</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!products || products.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">No products found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            products.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.name}</TableCell>
                                                    <TableCell>{p.category || "General"}</TableCell>
                                                    <TableCell>{p.stockQuantity}</TableCell>
                                                    <TableCell>UGX {Number(p.unitPrice).toLocaleString()}</TableCell>
                                                    <TableCell>UGX {(Number(p.stockQuantity) * Number(p.unitPrice)).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        {Number(p.stockQuantity) < 10 ? (
                                                            <Badge variant="destructive">Low Stock</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-green-600 border-green-200">In Stock</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                                        <p className="text-2xl font-bold text-primary">UGX {inventoryValue.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                                        <p className="text-2xl font-bold text-orange-600">{lowStockCount} Products</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {(reportType === "expenses_official" || reportType === "expenses_internal") && (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Payee</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredExpenses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">No expenses recorded.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredExpenses.map((e) => (
                                                <TableRow key={e.id}>
                                                    <TableCell>{format(new Date(e.date || ""), "dd/MM/yyyy")}</TableCell>
                                                    <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                                                    <TableCell>{e.description}</TableCell>
                                                    <TableCell>{e.payee || "-"}</TableCell>
                                                    <TableCell className="text-right font-mono">UGX {Number(e.amount).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {filteredExpenses.length > 0 && (
                                            <TableRow className="bg-muted/50 font-bold italic">
                                                <TableCell colSpan={4}>TOTAL EXPENSES</TableCell>
                                                <TableCell className="text-right font-mono">UGX {totalExpenses.toLocaleString()}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </>
                        )}

                        {reportType === "vat_report" && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="border-blue-200">
                                        <CardHeader className="py-4">
                                            <CardTitle className="text-sm font-medium text-blue-800">Output VAT (Sales)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">UGX {vatOutput.toLocaleString()}</div>
                                            <p className="text-xs text-muted-foreground mt-1">Total VAT collected from customers</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-green-200">
                                        <CardHeader className="py-4">
                                            <CardTitle className="text-sm font-medium text-green-800">Input VAT (Purchases)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">UGX {vatInput.toLocaleString()}</div>
                                            <p className="text-xs text-muted-foreground mt-1">Total VAT paid to suppliers</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={cn("border-slate-200", netVatPayable > 0 ? "border-red-200 bg-red-50/20" : "border-green-200 bg-green-50/20")}>
                                        <CardHeader className="py-4">
                                            <CardTitle className="text-sm font-medium">Net VAT {netVatPayable > 0 ? "Payable" : "Claimable"}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={cn("text-2xl font-bold", netVatPayable > 0 ? "text-red-700" : "text-green-700")}>
                                                UGX {Math.abs(netVatPayable).toLocaleString()}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Difference to be {netVatPayable > 0 ? "paid" : "claimed"}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="bg-muted/30 p-4 rounded-lg flex items-start gap-4">
                                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Tax Compliance Tip</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            This report calculates VAT based on verified business transactions within the selected dates.
                                            Ensure all your official invoices and valid purchase bills are recorded to maximize input tax credits.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(reportType === "accounts_receivable" || reportType === "accounts_payable") && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{reportType === "accounts_receivable" ? "Customer" : "Supplier"}</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="text-right">{reportType === "accounts_receivable" ? "Total Revenue" : "Total Owed"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportType === "accounts_receivable" ? (
                                        arData.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="text-center h-24">No customer balances.</TableCell></TableRow>
                                        ) : (
                                            arData.map(c => (
                                                <TableRow key={c.id}>
                                                    <TableCell className="font-semibold">{c.name}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{c.phone || "-"}</TableCell>
                                                    <TableCell className="text-right font-mono font-bold">UGX {c.totalOutstanding.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )
                                    ) : (
                                        apData.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="text-center h-24">No supplier balances.</TableCell></TableRow>
                                        ) : (
                                            apData.map(s => (
                                                <TableRow key={s.id}>
                                                    <TableCell className="font-semibold">{s.name}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{s.phone || "-"}</TableCell>
                                                    <TableCell className="text-right font-mono font-bold">UGX {s.totalOwed.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        )}

                        {isOwner && reportType === "profit_loss" && (
                            <div className="space-y-6 max-w-2xl mx-auto border p-8 rounded-xl bg-slate-50/50 shadow-inner">
                                <div className="text-center border-b pb-4 mb-4">
                                    <h3 className="text-lg font-bold uppercase tracking-wider">Statement of Profit & Loss</h3>
                                    <p className="text-sm text-muted-foreground">Period: {fromDate} to {toDate}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b pb-2">
                                        <div>
                                            <p className="font-semibold">Gross Revenue</p>
                                            <p className="text-xs text-muted-foreground">Total of official and internal sales</p>
                                        </div>
                                        <span className="font-mono text-lg font-bold text-green-700">UGX {totalRevenue.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-end border-b pb-2 text-red-700">
                                        <div>
                                            <p className="font-semibold">Cost of Purchases</p>
                                            <p className="text-xs text-muted-foreground">Total inventory acquisition cost</p>
                                        </div>
                                        <span className="font-mono font-medium">(UGX {totalCostOfSales.toLocaleString()})</span>
                                    </div>

                                    <div className="flex justify-between items-end pt-2">
                                        <span className="font-bold text-sm uppercase">Gross Profit</span>
                                        <span className="font-mono text-xl font-black border-b-2">UGX {grossProfit.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-end border-b pb-2 mt-8 text-red-700">
                                        <div>
                                            <p className="font-semibold">Operational Expenses</p>
                                            <p className="text-xs text-muted-foreground">Utilities, rent, salaries, etc.</p>
                                        </div>
                                        <span className="font-mono font-medium">(UGX {totalOpExpenses.toLocaleString()})</span>
                                    </div>

                                    <div className={cn(
                                        "flex justify-between items-center p-4 rounded-lg mt-8 border-2 border-double",
                                        netProfit >= 0 ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                                    )}>
                                        <div>
                                            <p className="font-black text-lg">NET {netProfit >= 0 ? "PROFIT" : "LOSS"}</p>
                                            <p className="text-xs text-muted-foreground">Final bottom line after all costs</p>
                                        </div>
                                        <span className={cn("font-mono text-2xl font-black", netProfit >= 0 ? "text-green-700" : "text-red-700")}>
                                            UGX {netProfit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isOwner && reportType === "comparison" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card>
                                    <CardHeader className="bg-blue-50/50">
                                        <CardTitle className="text-base text-blue-800">Verified Business (Official)</CardTitle>
                                        <CardDescription>Records for tax and regulatory purposes</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Sales Revenue</span>
                                            <span className="font-mono font-bold">UGX {comparisonData.official.sales.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Verified Expenses</span>
                                            <span className="font-mono text-red-600">UGX {comparisonData.official.expenses.toLocaleString()}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs">Transaction Count</span>
                                            <span className="text-xs font-bold">{comparisonData.official.count} Verified Docs</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="bg-orange-50/50">
                                        <CardTitle className="text-base text-orange-800">Operational History (Internal)</CardTitle>
                                        <CardDescription>Proprietary non-official flow</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Internal Revenue</span>
                                            <span className="font-mono font-bold">UGX {comparisonData.internal.sales.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Internal Costs</span>
                                            <span className="font-mono text-red-600">UGX {comparisonData.internal.expenses.toLocaleString()}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs">Transaction Count</span>
                                            <span className="text-xs font-bold">{comparisonData.internal.count} Records</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                    </CardContent>
                </Card>
            </div>

            {/* Print friendly view (Simplified) */}
            <div className="hidden print:block space-y-6">
                <div className="text-center space-y-2 border-b pb-4">
                    <h1 className="text-2xl font-bold">Bharat Bhai ERP - Sales Report (Official)</h1>
                    <p>Period: {fromDate} to {toDate}</p>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">VAT</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSales.map((s) => (
                            <TableRow key={s.sale.id}>
                                <TableCell>{format(new Date(s.sale.date || ""), "yyyy-MM-dd")}</TableCell>
                                <TableCell>{s.sale.invoiceNumber}</TableCell>
                                <TableCell>{s.customer?.name || "Cash Customer"}</TableCell>
                                <TableCell className="text-right">{Number(s.sale.subtotal).toLocaleString()}</TableCell>
                                <TableCell className="text-right">{Number(s.sale.vatAmount).toLocaleString()}</TableCell>
                                <TableCell className="text-right">{Number(s.sale.totalAmount).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2">
                            <TableCell colSpan={3}>TOTAL</TableCell>
                            <TableCell className="text-right">{totalSubtotalSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{totalVatSales.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{totalOfficialSales.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Show other reports grid below if needed, or if Owner */}
            {isOwner && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 print:hidden">
                    <ReportCard
                        title="Internal Sales"
                        icon={Lock}
                        description="Non-official revenue"
                        count={sales?.filter(s => s.sale.type === "internal").length}
                        color="bg-orange-50/50"
                        textColor="text-orange-800"
                    />
                    <ReportCard
                        title="Total Expenses"
                        icon={BarChart4}
                        description="Operational costs"
                        count={expenses?.length || 0}
                        color="bg-primary/5"
                    />
                </div>
            )}
        </div>
    );
}

function ReportCard({ title, icon: Icon, description, count, color, action, textColor = "text-foreground" }: any) {
    return (
        <Card className={`${color} border shadow-sm transition-all hover:shadow-md cursor-pointer`}>
            <CardHeader className="pb-2">
                <CardTitle className={`text-base font-semibold flex items-center justify-between ${textColor}`}>
                    {title}
                    <Icon className="h-4 w-4 opacity-70" />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {count !== undefined && (
                    <div className="text-2xl font-bold font-mono">
                        {count} <span className="text-xs font-normal text-muted-foreground ml-1">Records</span>
                    </div>
                )}
                {action && (
                    <div className="flex items-center text-sm font-medium opacity-80 mt-2">
                        {action} <TrendingUp className="ml-2 h-3 w-3" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Helper to generate Tally XML
function generateTallyXML(sales: any[], purchases: any[]) {
    // Basic structure for Tally XML Import
    return `
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
        const invNo = sale.invoiceNumber || 'N/A';
        const date = new Date(sale.date || Date.now()).toISOString().split('T')[0].replace(/-/g, '');
        const ledgerName = customer?.name || 'Cash Customer';
        const narration = `Cash Sale ${invNo}`;

        return `
                <TALLYMESSAGE>
                    <VOUCHER VCHTYPE="Sales" ACTION="Create">
                        <DATE>${date}</DATE>
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
                </TALLYMESSAGE>
                `;
    }).join('')}
                ${(purchases || []).map(item => {
        const purchase = item.purchase || item;
        const supplier = item.supplier;
        const billNo = purchase.billNumber || 'PURCH-' + purchase.id;
        const date = new Date(purchase.date || Date.now()).toISOString().split('T')[0].replace(/-/g, '');
        const ledgerName = supplier?.name || 'Cash Supplier';
        const narration = `Purchase Bill ${billNo}`;

        return `
                <TALLYMESSAGE>
                    <VOUCHER VCHTYPE="Purchase" ACTION="Create">
                        <DATE>${date}</DATE>
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
                </TALLYMESSAGE>
                `;
    }).join('')}
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>
    `.trim();
}
