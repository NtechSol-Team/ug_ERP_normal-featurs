import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useProducts, useSuppliers, useCreatePurchase, usePurchase, useUpdatePurchase } from "@/hooks/use-erp";
import { ArrowLeft, Trash2, Plus, Loader2, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const purchaseFormSchema = z.object({
  supplierId: z.string().optional(),
  type: z.enum(["official", "internal"]),
  status: z.enum(["draft", "completed", "cancelled"]),
  billNumber: z.string().optional(),
  date: z.string().min(1, "Bill date is required"),
  items: z.array(z.object({
    productId: z.string().min(1, "Product required"),
    quantity: z.coerce.number().min(1),
    unitCost: z.coerce.number().min(0),
    vatRate: z.coerce.number().default(0.18),
  })).min(1, "Add at least one item"),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function CreatePurchase({ id }: { id?: number }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const { data: existingPurchase, isLoading: isLoadingPurchase } = usePurchase(id);
  const { mutate: createPurchase, isPending: isCreating } = useCreatePurchase();
  const { mutate: updatePurchase, isPending: isUpdating } = useUpdatePurchase();
  const isPending = isCreating || isUpdating;

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<PurchaseFormValues | null>(null);
  const [open, setOpen] = useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      type: "official",
      status: "completed",
      items: [{ productId: "", quantity: 1, unitCost: 0, vatRate: 0.18 }],
      notes: "",
      billNumber: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchType = form.watch("type");
  const isInternal = watchType === "internal";

  const subtotal = watchItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitCost || 0);
  }, 0);

  // VAT hidden for internal
  const vatAmount = watchItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitCost || 0);
    const rate = isInternal ? 0 : (item.vatRate ?? 0.18);
    return sum + (itemTotal * rate);
  }, 0);

  const totalAmount = subtotal + vatAmount;

  useEffect(() => {
    if (!id) {
      // For NEW Purchase: Reset to defaults
      form.reset({
        type: "official",
        status: "completed",
        items: [{ productId: "", quantity: 1, unitCost: 0, vatRate: 0.18 }],
        notes: "",
        billNumber: "",
        date: new Date().toISOString().split('T')[0],
      });
    } else if (existingPurchase) {
      // For EDIT Purchase: Populate with existing data
      form.reset({
        type: existingPurchase.purchase.type,
        status: existingPurchase.purchase.status,
        billNumber: existingPurchase.purchase.billNumber || "",
        date: existingPurchase.purchase.date ? new Date(existingPurchase.purchase.date).toISOString().split('T')[0] : "",
        supplierId: existingPurchase.purchase.supplierId?.toString(),
        notes: existingPurchase.purchase.notes || "",
        items: existingPurchase.items.map((i: any) => ({
          productId: i.productId.toString(),
          quantity: i.quantity,
          unitCost: Number(i.unitCost),
          vatRate: Number(i.vatRate || 0.18),
        })),
      });
    }
  }, [id, existingPurchase, form]);

  function handleFormSubmit(values: PurchaseFormValues) {
    if (isOwner && values.type === "internal") {
      setPendingValues(values);
      setShowConfirm(true);
    } else {
      executeSubmit(values);
    }
  }

  function executeSubmit(values: PurchaseFormValues) {
    const payload = {
      billNumber: values.billNumber,
      supplierId: values.supplierId ? (isNaN(parseInt(values.supplierId)) ? values.supplierId : parseInt(values.supplierId)) : undefined,
      type: isOwner ? values.type : "official",
      status: values.status,
      items: values.items.map(i => ({
        productId: parseInt(i.productId),
        quantity: i.quantity,
        unitCost: i.unitCost,
        vatRate: i.vatRate,
      })),
      subtotal: subtotal.toString(),
      vatAmount: vatAmount.toString(),
      totalAmount: totalAmount.toString(),
      notes: values.notes,
      date: values.date,
    };

    if (id) {
      updatePurchase({ id, data: payload as any }, {
        onSuccess: () => setLocation("/purchases"),
      });
    } else {
      createPurchase(payload as any, {
        onSuccess: () => setLocation("/purchases"),
      });
    }
  }

  // Helper to auto-fill cost if needed (optional feature, based on last cost?)
  // For now just basic selection
  const updateProductSelection = (index: number, productId: string) => {
    // Could auto-fill cost here if we had that data in product list
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/purchases")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {id ? "Edit Purchase" : "New Purchase"}
          </h2>
          <p className="text-muted-foreground">
            {id ? `Update bill ${existingPurchase?.purchase.billNumber || existingPurchase?.purchase.id}` : "Record a bill or restock inventory"}
          </p>
        </div>
      </div>

      {id && isLoadingPurchase ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            <Card>
              <CardContent className="p-6 grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. BILL-1023" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        Supplier {isInternal ? "(Optional)" : "*"}
                      </FormLabel>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? suppliers?.find(
                                  (s) => s.id.toString() === field.value
                                )?.name || field.value
                                : "Select or type supplier name"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Search supplier..." />
                            <CommandList>
                              <CommandEmpty className="p-0">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start font-normal text-primary"
                                  onClick={() => {
                                    const query = (document.querySelector('[cmdk-input]') as HTMLInputElement)?.value;
                                    if (query) {
                                      field.onChange(query);
                                      setOpen(false);
                                    }
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add new supplier
                                </Button>
                              </CommandEmpty>
                              <CommandGroup>
                                {suppliers?.map((s) => (
                                  <CommandItem
                                    value={s.name}
                                    key={s.id}
                                    onSelect={() => {
                                      field.onChange(s.id.toString());
                                      setOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        s.id.toString() === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {s.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isOwner && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="official">Official (VAT)</SelectItem>
                            <SelectItem value="internal" className="text-orange-600">Internal (Owner Only)</SelectItem>
                          </SelectContent>
                        </Select>
                        {field.value === "internal" && (
                          <p className="text-xs text-orange-600 font-medium">
                            ⚠ Internal records are hidden from employees
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 1, unitCost: 0, vatRate: 0.18 })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardContent className="p-4 grid gap-4 md:grid-cols-12 items-end">
                    <div className="md:col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Product</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                updateProductSelection(index, val);
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products?.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitCost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Cost (UGX)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.vatRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">VAT Rate</FormLabel>
                            <Select onValueChange={(val) => field.onChange(parseFloat(val))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0.18">18%</SelectItem>
                                <SelectItem value="0.15">15%</SelectItem>
                                <SelectItem value="0.05">5%</SelectItem>
                                <SelectItem value="0">0%</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-muted/30">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-mono">{subtotal.toLocaleString()}</span>
                </div>

                {!isInternal && (
                  <div className="flex justify-between text-sm">
                    <span>VAT (18%):</span>
                    <span className="font-mono">{vatAmount.toLocaleString()}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Cost:</span>
                  <span className="font-mono text-primary">UGX {totalAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/purchases")}>Cancel</Button>
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className={isInternal ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {id ? "Save Updates" : (isInternal ? "Record Internal Purchase" : "Record Official Purchase")}
              </Button>
            </div>
          </form>
        </Form>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-orange-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Confirm Internal Purchase
            </AlertDialogTitle>
            <AlertDialogDescription>
              This record will be saved as <strong>Internal</strong>.
              It will be excluded from official VAT reports.
              Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingValues && executeSubmit(pendingValues)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
