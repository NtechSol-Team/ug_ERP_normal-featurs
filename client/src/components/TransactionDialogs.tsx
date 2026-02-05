import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/use-erp";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export function ViewInvoiceDialog({ saleData, children }: { saleData: any, children: React.ReactNode }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <ViewInvoiceDialogContent saleData={saleData} />
        </Dialog>
    );
}

export function ViewInvoiceDialogContent({ saleData }: { saleData: any }) {
    const { sale, customer, items } = saleData;

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle className="text-2xl flex justify-between items-center">
                    <span>Invoice: {sale.invoiceNumber}</span>
                    <Badge variant="outline" className="uppercase">{sale.type}</Badge>
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Customer</p>
                        {customer?.name ? (
                            <p className="font-semibold text-base">{customer.name}</p>
                        ) : (
                            <div className="flex flex-col leading-tight">
                                <p className="font-semibold text-base">Walk-in</p>
                                <p className="text-[10px] text-muted-foreground uppercase opacity-70">Customer</p>
                            </div>
                        )}
                        {customer?.phone && <p>{customer.phone}</p>}
                        {customer?.address && <p>{customer.address}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-semibold">{new Date(sale.date).toLocaleDateString()}</p>
                        <p className="text-muted-foreground mt-2">Status</p>
                        <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                            {sale.status}
                        </Badge>
                    </div>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items?.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">{item.product}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>UGX {Number(sale.subtotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VAT (Inclusive/Calculated)</span>
                        <span className="text-blue-600">UGX {Number(sale.vatAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2 font-mono">
                        <span>Total Amount</span>
                        <span>UGX {Number(sale.totalAmount).toLocaleString()}</span>
                    </div>
                </div>

                {sale.notes && (
                    <div className="bg-muted/30 p-3 rounded-lg text-sm italic">
                        <p className="font-semibold not-italic mb-1">Notes:</p>
                        {sale.notes}
                    </div>
                )}
            </div>
        </DialogContent>
    );
}

export function ViewBillDialog({ purchaseData, children }: { purchaseData: any, children: React.ReactNode }) {
    const { purchase, supplier, items } = purchaseData;

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex justify-between items-center">
                        <span>Bill: {purchase.billNumber || "PRCH-" + purchase.id}</span>
                        <Badge variant="outline" className="uppercase">{purchase.type}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Supplier</p>
                            <p className="font-semibold text-base">{supplier?.name || "Cash Supplier"}</p>
                            {supplier?.phone && <p>{supplier.phone}</p>}
                            {supplier?.address && <p>{supplier.address}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-semibold">{new Date(purchase.date).toLocaleDateString()}</p>
                            <p className="text-muted-foreground mt-2">Status</p>
                            <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                                {purchase.status}
                            </Badge>
                        </div>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items?.map((item: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{item.product}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>UGX {Number(purchase.subtotal).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">VAT</span>
                            <span className="text-green-600">UGX {Number(purchase.vatAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2 font-mono">
                            <span>Total Bill Amount</span>
                            <span>UGX {Number(purchase.totalAmount).toLocaleString()}</span>
                        </div>
                    </div>

                    {purchase.notes && (
                        <div className="bg-muted/30 p-3 rounded-lg text-sm italic">
                            <p className="font-semibold not-italic mb-1">Notes:</p>
                            {purchase.notes}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function AuditLogDetails({ changes }: { changes: any }) {
    const { data: products } = useProducts();

    if (!changes) return null;

    const beforeItems = changes.before?.items || [];
    const afterItems = changes.after?.items || (Array.isArray(changes.items) ? changes.items : []);

    // Case 1: Multi-item change (Invoice/Bill)
    if (beforeItems.length > 0 || afterItems.length > 0 || changes.items) {
        if (beforeItems.length === 0 && afterItems.length === 0 && changes.items) {
            afterItems.push(...changes.items);
        }

        const productIds = Array.from(new Set([
            ...beforeItems.map((i: any) => Number(i.productId)),
            ...afterItems.map((i: any) => Number(i.productId))
        ]));

        return (
            <div className="space-y-3 mt-2">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-primary/70">Transaction Details:</p>
                    <div className="grid gap-1.5">
                        {productIds.map((pid) => {
                            const product = products?.find(p => p.id === pid);
                            const before = beforeItems.find((i: any) => Number(i.productId) === pid);
                            const after = afterItems.find((i: any) => Number(i.productId) === pid);

                            const isNew = !before && after;
                            const isDeleted = before && !after;
                            const isUpdated = before && after && (
                                before.quantity !== after.quantity ||
                                Number(before.unitPrice || before.unitCost) !== Number(after.unitPrice || after.unitCost) ||
                                Number(before.vatRate) !== Number(after.vatRate)
                            );

                            if (!isNew && !isDeleted && !isUpdated && beforeItems.length > 0) return null;

                            return (
                                <div key={pid} className={cn(
                                    "border p-2 rounded text-[11px] transition-colors shadow-sm",
                                    isNew ? "bg-green-50/40 border-green-200" :
                                        isDeleted ? "bg-red-50/40 border-red-200 opacity-70" :
                                            "bg-background/80 border-border/40"
                                )}>
                                    <div className="flex justify-between items-start mb-1.5">
                                        <p className="font-bold text-foreground truncate max-w-[180px]">
                                            {product?.name || `Product #${pid}`}
                                        </p>
                                        <div className="flex gap-1">
                                            {isNew && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[8px] h-3.5 px-1.5 border-green-200">NEW</Badge>}
                                            {isDeleted && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 text-[8px] h-3.5 px-1.5 border-red-200 uppercase">REMOVED</Badge>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <div className="space-y-0.5 border-r border-border/20 pr-2">
                                            <p className="text-muted-foreground uppercase text-[8px] font-bold tracking-tight">Quantity</p>
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                {before && <span className={cn("font-mono", after ? "line-through opacity-40 text-muted-foreground" : "font-semibold")}>{before.quantity}</span>}
                                                {before && after && before.quantity !== after.quantity && <span className="text-primary/50">→</span>}
                                                {after && <span className={cn("font-mono", isNew ? "text-green-700 font-bold" : "font-bold text-primary")}>{after.quantity}</span>}
                                            </div>
                                        </div>
                                        <div className="space-y-0.5 text-right pl-2">
                                            <p className="text-muted-foreground uppercase text-[8px] font-bold tracking-tight">Price/Unit</p>
                                            <div className="flex items-center justify-end gap-1.5 font-mono text-[10px]">
                                                {before && <span className={cn(after ? "line-through opacity-40 text-muted-foreground" : "font-semibold")}>{Number(before.unitPrice || before.unitCost || 0).toLocaleString()}</span>}
                                                {after && <span className={cn(isNew ? "text-green-700 font-bold" : "font-bold text-primary")}>{Number(after.unitPrice || after.unitCost || 0).toLocaleString()}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {((before?.vatRate && after?.vatRate && Number(before.vatRate) !== Number(after.vatRate)) || (isNew && Number(after?.vatRate) > 0)) && (
                                        <div className="mt-2 pt-1 border-t border-dotted flex justify-between items-center opacity-90">
                                            <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">Tax Rate</span>
                                            <div className="flex items-center gap-1 text-[9px] font-mono">
                                                {before && <span>{(Number(before.vatRate || 0) * 100).toFixed(0)}%</span>}
                                                {before && after && Number(before.vatRate) !== Number(after.vatRate) && <span className="text-primary/50">→</span>}
                                                {after && <span className="font-bold text-primary">{(Number(after.vatRate || 0) * 100).toFixed(0)}%</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {Object.entries(changes).map(([key, value]) => {
                    if (key === 'items' || key === 'before' || key === 'after') return null;
                    return (
                        <div key={key} className="flex justify-between items-center text-[10px] border-b border-border/10 pb-1 px-1">
                            <span className="text-muted-foreground uppercase font-medium">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-bold text-primary/80">{String(value)}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Case 2: Single Entity Change (Product, Product Stock, Settings etc)
    const before = changes.before || {};
    const after = changes.after || {};
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    return (
        <div className="space-y-2 mt-2">
            <div className="grid gap-1.5">
                {changes.adjustment && (
                    <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-lg flex flex-col gap-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-primary tracking-tight">Stock Activity</span>
                            <Badge className={cn(
                                "text-xs font-black px-2 py-0.5",
                                Number(changes.adjustment) > 0 ? "bg-green-600 shadow-sm" : "bg-red-600 shadow-sm"
                            )}>
                                {Number(changes.adjustment) > 0 ? "+" : ""}{changes.adjustment} UNITS
                            </Badge>
                        </div>
                        {changes.before?.stockQuantity !== undefined && (
                            <div className="flex items-center gap-1.5 text-[11px] mt-1 pt-2 border-t border-dotted border-primary/30">
                                <span className="text-muted-foreground">Original Stock: <span className="font-mono font-bold text-foreground">{changes.before.stockQuantity}</span></span>
                                <span className="text-primary/50 font-bold mx-0.5">→</span>
                                <span className="text-foreground font-medium">Final Stock: <span className="font-mono font-bold text-primary">{changes.after.stockQuantity}</span></span>
                            </div>
                        )}
                    </div>
                )}
                {keys.map(key => {
                    const bVal = before[key];
                    const aVal = after[key];
                    if (bVal === aVal) return null;
                    if (key === 'items' || key === 'id' || key === 'createdAt' || key === 'createdBy') return null;

                    // Skip stockQuantity if we already showed it in the adjustment block
                    if (changes.adjustment && key === 'stockQuantity') return null;

                    return (
                        <div key={key} className="bg-background border border-border/40 p-2 rounded shadow-sm">
                            <p className="text-muted-foreground uppercase text-[8px] font-bold tracking-tight mb-1">
                                {key.replace(/([A-Z])/g, ' $1')}
                            </p>
                            <div className="flex items-center gap-2 text-[11px]">
                                {bVal !== undefined && (
                                    <span className="font-mono text-muted-foreground line-through opacity-60">
                                        {typeof bVal === 'boolean' ? (bVal ? 'Yes' : 'No') : String(bVal)}
                                    </span>
                                )}
                                <span className="text-primary/50 text-[10px]">→</span>
                                <span className="font-mono font-bold text-primary">
                                    {typeof aVal === 'boolean' ? (aVal ? 'Yes' : 'No') : String(aVal)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
