import { Link } from "wouter";
import { usePurchases } from "@/hooks/use-erp";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function Purchases() {
  const { data: purchases, isLoading } = usePurchases();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchases</h2>
          <p className="text-muted-foreground">Track supplier bills and inventory restocking.</p>
        </div>
        <Link href="/purchases/new">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </Link>
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
              purchases?.map((purchase: any) => (
                <TableRow 
                  key={purchase.id}
                  className={cn(
                    purchase.type === "internal" && isOwner && "bg-blue-50/50 hover:bg-blue-50"
                  )}
                >
                  <TableCell className="font-mono font-medium">{purchase.billNumber || "-"}</TableCell>
                  <TableCell>{new Date(purchase.date).toLocaleDateString()}</TableCell>
                  <TableCell>{purchase.supplier?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {purchase.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono text-base">
                    {Number(purchase.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                      {purchase.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
