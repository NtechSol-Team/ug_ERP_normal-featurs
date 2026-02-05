import { useState } from "react";
import { Plus, Search, Package, AlertCircle, Edit2, Trash2, History, TrendingUp, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProductSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useAddStock,
  useAuditLogs
} from "@/hooks/use-erp";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditLogDetails } from "@/components/TransactionDialogs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

// Frontend schema adapts backend schema (coercion for numbers)
const formSchema = insertProductSchema.extend({
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).optional(),
  stockQuantity: z.coerce.number().min(0),
  reorderLevel: z.coerce.number().min(0),
  vatRate: z.coerce.number().default(18),
});

export default function Inventory() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [stockingProduct, setStockingProduct] = useState<any>(null);
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const { mutate: deleteProduct } = useDeleteProduct();
  const { toast } = useToast();

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">Manage products, stock levels, and pricing.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <ProductFormContent onSuccess={() => setIsAddOpen(false)} />
        </Dialog>
      </div>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        {editingProduct && (
          <ProductFormContent
            product={editingProduct}
            onSuccess={() => setEditingProduct(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!stockingProduct} onOpenChange={(open) => !open && setStockingProduct(null)}>
        {stockingProduct && (
          <AddStockDialog
            product={stockingProduct}
            onSuccess={() => setStockingProduct(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!historyProduct} onOpenChange={(open) => !open && setHistoryProduct(null)}>
        {historyProduct && (
          <HistoryDialog
            product={historyProduct}
            onClose={() => setHistoryProduct(null)}
          />
        )}
      </Dialog>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="border rounded-lg shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              {user?.role === "owner" && (
                <>
                  <TableHead className="text-right">Buying Price</TableHead>
                  <TableHead className="text-right">Expected Profit</TableHead>
                </>
              )}
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={user?.role === "owner" ? 9 : 7} className="h-24 text-center">Loading inventory...</TableCell>
              </TableRow>
            ) : filteredProducts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user?.role === "owner" ? 9 : 7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    No products found. Add your first product!
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="font-mono text-xs">{product.sku || "-"}</TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {Number(product.unitPrice).toLocaleString()}
                  </TableCell>
                  {user?.role === "owner" && (
                    <>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {Number(product.costPrice || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">
                        {((Number(product.unitPrice) - Number(product.costPrice || 0)) * (product.stockQuantity || 0)).toLocaleString()}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 font-mono font-bold">
                      {product.stockQuantity}
                      {product.stockQuantity <= (product.reorderLevel || 10) && (
                        <AlertCircle className="h-4 w-4 text-orange-500 animate-pulse" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={product.stockQuantity > (product.reorderLevel || 10) ? "default" : product.stockQuantity > 0 ? "secondary" : "destructive"}
                      className="text-[10px] uppercase font-bold"
                    >
                      {product.stockQuantity > (product.reorderLevel || 10) ? "Healthy" : product.stockQuantity > 0 ? "Low Stock" : "Out of Stock"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStockingProduct(product)}>
                          <TrendingUp className="mr-2 h-4 w-4" /> Add Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryProduct(product)}>
                          <History className="mr-2 h-4 w-4" /> History
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this product? It will be marked as inactive.")) {
                              deleteProduct(product.id, {
                                onSuccess: () => toast({ title: "Product deleted" })
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ProductFormContent({ product, onSuccess }: { product?: any, onSuccess: () => void }) {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const isPending = isCreating || isUpdating;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      category: product?.category || "",
      unitPrice: product ? Number(product.unitPrice) : 0,
      costPrice: product ? Number(product.costPrice) : 0,
      stockQuantity: product ? Number(product.stockQuantity) : 0,
      reorderLevel: product ? Number(product.reorderLevel) : 10,
      vatRate: product ? Number(product.vatRate) : 18,
      isActive: product ? product.isActive : true,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (product) {
      updateProduct({ id: product.id, data: values as any }, { onSuccess });
    } else {
      createProduct(values as any, { onSuccess });
    }
  }

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Wireless Mouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="PROD-001" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Electronics" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (UGX)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isOwner && (
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buying Price (UGX)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="stockQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Stock</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reorderLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Level</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Product details..." {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (product ? "Updating..." : "Adding...") : (product ? "Save Changes" : "Add Product")}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

function AddStockDialog({ product, onSuccess }: { product: any, onSuccess: () => void }) {
  const { mutate, isPending } = useAddStock();
  const [amount, setAmount] = useState<string>("0");

  const handleStock = () => {
    mutate({ id: product.id, amount: Number(amount) }, {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Add Stock: {product.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Adjust Quantity (Add or Subtract)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Current Stock: {product.stockQuantity}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button onClick={handleStock} disabled={isPending}>
            {isPending ? "Updating..." : "Update Stock"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function HistoryDialog({ product, onClose }: { product: any, onClose: () => void }) {
  const { data: logs, isLoading } = useAuditLogs('product', product.id);

  return (
    <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Audit History: {product.name}</DialogTitle>
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
