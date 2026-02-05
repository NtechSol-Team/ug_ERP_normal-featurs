import { useState } from "react";
import { Link, useLocation } from "wouter";
import { usePurchases, useDeletePurchase, useAuditLogs } from "@/hooks/use-erp";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, ShoppingBag, MoreVertical, Edit2, Trash2, History, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ViewBillDialog, AuditLogDetails } from "@/components/TransactionDialogs";

export default function Purchases() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const { data: paginatedPurchases, isLoading } = usePurchases(page, limit);
  const purchases = paginatedPurchases?.data || [];
  const totalPages = Math.ceil((paginatedPurchases?.total || 0) / limit);

  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const { mutate: deletePurchase } = useDeletePurchase();
  const { toast } = useToast();
  const [historyPurchase, setHistoryPurchase] = useState<any>(null);
  const [showGeneralHistory, setShowGeneralHistory] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <Dialog open={!!historyPurchase} onOpenChange={(open) => !open && setHistoryPurchase(null)}>
        {historyPurchase && (
          <HistoryDialog
            purchase={historyPurchase}
            onClose={() => setHistoryPurchase(null)}
          />
        )}
      </Dialog>

      <Dialog open={showGeneralHistory} onOpenChange={setShowGeneralHistory}>
        <GeneralHistoryDialog onClose={() => setShowGeneralHistory(false)} />
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchases</h2>
          <p className="text-muted-foreground">Track supplier bills and inventory restocking.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowGeneralHistory(true)}>
            <History className="mr-2 h-4 w-4" />
            General History
          </Button>
          <Link href="/purchases/new">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search bill #" className="h-9" />
      </div>

      <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Bill #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading purchases...</TableCell>
              </TableRow>
            ) : purchases?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
                    No purchases recorded yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              purchases?.map((item: any) => (
                <ViewBillDialog key={item.purchase.id} purchaseData={item}>
                  <TableRow
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      item.purchase.type === "internal" && isOwner && "bg-blue-50/50 hover:bg-blue-50"
                    )}
                  >
                    <TableCell className="font-mono font-medium">{item.purchase.billNumber || "PRCH-" + item.purchase.id}</TableCell>
                    <TableCell>{new Date(item.purchase.date).toLocaleDateString()}</TableCell>
                    <TableCell>{item.supplier?.name || "Cash Supplier"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {item.purchase.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-base">
                      {Number(item.purchase.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.purchase.status === 'completed' ? 'default' : 'secondary'}>
                        {item.purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/purchases/edit/${item.purchase.id}`);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setHistoryPurchase(item.purchase);
                          }}>
                            <History className="mr-2 h-4 w-4" /> History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this purchase? This will revert stock levels.")) {
                                deletePurchase(item.purchase.id, {
                                  onSuccess: () => toast({ title: "Purchase deleted successfully" })
                                });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </ViewBillDialog>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {purchases.length} of {paginatedPurchases?.total || 0} purchases
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {page} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function HistoryDialog({ purchase, onClose }: { purchase: any, onClose: () => void }) {
  const { data: logs, isLoading } = useAuditLogs('purchase', purchase.id);

  return (
    <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Audit History: {purchase.billNumber || `PRCH-${purchase.id}`}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading history...</p>
        ) : logs?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No history recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {logs?.map((entry: any) => (
              <div key={entry.log.id} className="border-l-2 border-primary/20 pl-4 py-2 relative">
                <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-primary" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground uppercase">{entry.log.action.replace('_', ' ')}</span>
                  <span>{format(new Date(entry.log.timestamp), "MMM d, yyyy HH:mm")}</span>
                </div>
                <p className="text-sm mt-1">{entry.user?.username || 'System'}</p>
                {entry.log.changes && (
                  <AuditLogDetails changes={entry.log.changes} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  );
}

function GeneralHistoryDialog({ onClose }: { onClose: () => void }) {
  const { data: logs, isLoading } = useAuditLogs('purchase');

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          General Purchases Activity History
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading history...</p>
        ) : logs?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No purchase activity recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {logs?.map((entry: any) => (
              <div key={entry.log.id} className="border-l-2 border-primary/20 pl-4 py-3 relative bg-muted/20 rounded-r-lg">
                <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-primary" />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="font-bold text-foreground uppercase tracking-wider bg-background px-1.5 py-0.5 rounded border">
                    {entry.log.action.replace('_', ' ')}
                  </span>
                  <span>{format(new Date(entry.log.timestamp), "MMM d, yyyy HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">User:</span>
                  <span className="font-semibold">{entry.user?.username || 'System'}</span>
                  {entry.log.entityId && (
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                      Purchase #{entry.log.entityId}
                    </Badge>
                  )}
                </div>
                {entry.log.changes && (
                  <div className="mt-2 text-[10px]">
                    <p className="font-medium text-muted-foreground mb-1 uppercase tracking-tighter">Modifications:</p>
                    <AuditLogDetails changes={entry.log.changes} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  );
}
