import { Link } from "wouter";
import { useSales } from "@/hooks/use-erp";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, FileText } from "lucide-react";
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

export default function Sales() {
  const { data: sales, isLoading } = useSales();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales & Invoices</h2>
          <p className="text-muted-foreground">Track all sales transactions and invoices.</p>
        </div>
        <Link href="/sales/new">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search invoice #" className="h-9" />
      </div>

      <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading sales...</TableCell>
              </TableRow>
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    No sales recorded yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((sale: any) => (
                <TableRow 
                  key={sale.id}
                  className={cn(
                    sale.type === "internal" && isOwner && "bg-blue-50/50 hover:bg-blue-50"
                  )}
                >
                  <TableCell className="font-mono font-medium">{sale.invoiceNumber}</TableCell>
                  <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                  <TableCell>{sale.customer?.name || "Walk-in Customer"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {sale.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono text-base">
                    {Number(sale.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                      {sale.status}
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
