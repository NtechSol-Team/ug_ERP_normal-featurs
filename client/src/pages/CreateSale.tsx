import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useProducts, useCustomers, useCreateSale, useSale, useUpdateSale } from "@/hooks/use-erp";
import { ArrowLeft, Trash2, Plus, Loader2, AlertTriangle } from "lucide-react";
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
import { startTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

// Schema for the form
const saleFormSchema = z.object({
  customerId: z.string().optional(),
  type: z.enum(["official", "internal"]),
  status: z.enum(["draft", "completed", "cancelled"]),
  invoiceNumber: z.string().min(1),
  date: z.string().min(1, "Invoice date is required"),
  items: z.array(z.object({
    productId: z.string().min(1, "Product required"),
    quantity: z.coerce.number().min(1, "Qty must be >= 1"),
    unitPrice: z.coerce.number().min(0),
    vatRate: z.coerce.number().default(0.18),
  })).min(1, "Add at least one item"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // REQUIREMENT: Customer mandatory for Official sales
  if (data.type === "official" && !data.customerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Customer is required for Official sales",
      path: ["customerId"],
    });
  }
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function CreateSale({ id }: { id?: number }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { data: existingSale, isLoading: isLoadingSale, error: saleError } = useSale(id);

  if (saleError) {
    console.error(`Error loading sale:`, saleError);
  }
  const { mutate: createSale, isPending: isCreating } = useCreateSale();
  const { mutate: updateSale, isPending: isUpdating } = useUpdateSale();
  const isPending = isCreating || isUpdating;

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<SaleFormValues | null>(null);
  const [open, setOpen] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      type: "official",
      status: "completed",
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      items: [{ productId: "", quantity: 1, unitPrice: 0, vatRate: 0.18 }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchType = form.watch("type");

  // Conditionally calculate VAT
  const isInternal = watchType === "internal";

  const subtotal = watchItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  // Requirement: Internal has NO VAT
  // For Official: Calculate VAT based on per-item rate
  const vatAmount = isInternal
    ? 0
    : watchItems.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + (itemTotal * (item.vatRate ?? 0.18));
    }, 0);

  const totalAmount = subtotal + vatAmount;

  useEffect(() => {
    if (!id) {
      // For NEW Sale: Reset to defaults
      form.reset({
        type: "official",
        status: "completed",
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().split('T')[0],
        items: [{ productId: "", quantity: 1, unitPrice: 0, vatRate: 0.18 }],
        notes: "",
      });
    } else if (existingSale) {
      // For EDIT Sale: Populate with existing data
      form.reset({
        type: existingSale.sale.type,
        status: existingSale.sale.status,
        invoiceNumber: existingSale.sale.invoiceNumber,
        date: existingSale.sale.date ? new Date(existingSale.sale.date).toISOString().split('T')[0] : "",
        customerId: existingSale.sale.customerId?.toString(),
        notes: existingSale.sale.notes || "",
        items: existingSale.items.map((i: any) => ({
          productId: i.productId.toString(),
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          vatRate: Number(i.vatRate || 0.18),
        })),
      });
    }
  }, [id, existingSale, form]);

  function handleFormSubmit(values: SaleFormValues) {
    if (isOwner && values.type === "internal") {
      setPendingValues(values);
      setShowConfirm(true);
    } else {
      executeSubmit(values);
    }
  }

  function executeSubmit(values: SaleFormValues) {
    const payload = {
      invoiceNumber: values.invoiceNumber,
      customerId: values.customerId ? (isNaN(parseInt(values.customerId)) ? values.customerId : parseInt(values.customerId)) : undefined,
      type: isOwner ? values.type : "official",
      status: values.status,
      items: values.items.map(i => ({
        productId: parseInt(i.productId),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
      })),
      subtotal: subtotal.toString(),
      vatAmount: vatAmount.toString(),
      totalAmount: totalAmount.toString(),
      notes: values.notes,
      date: values.date,
    };

    if (id) {
      updateSale({ id, data: payload as any }, {
        onSuccess: () => setLocation("/sales"),
      });
    } else {
      createSale(payload as any, {
        onSuccess: () => setLocation("/sales"),
      });
    }
  }

  // Auto-update unit price when product selected
  const updatePrice = (index: number, productId: string) => {
    const product = products?.find(p => p.id.toString() === productId);
    if (product) {
      form.setValue(`items.${index}.unitPrice`, Number(product.unitPrice));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/sales")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {id ? "Edit Sale" : "New Sale"}
          </h2>
          <p className="text-muted-foreground">
            {id ? `Update invoice ${existingSale?.sale.invoiceNumber}` : "Create a new invoice"}
          </p>
        </div>
      </div>

      {id && isLoadingSale ? (
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
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                            ⚠ Internal transactions are hidden from employees
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        Customer {isInternal ? "(Optional)" : "*"}
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
                                ? customers?.find(
                                  (c) => c.id.toString() === field.value
                                )?.name || field.value
                                : "Select or type customer name"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Search customer..." />
                            <CommandList>
                              <CommandEmpty className="p-0">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start font-normal text-primary"
                                  onClick={() => {
                                    const query = (document.querySelector('[cmdk-input]') as HTMLInputElement)?.value;
                                    if (query) {
                                      field.onChange(query);
                                      // Close popover logic: 
                                      // We need to trigger an ESC or similar, but Popover usually closes on outside click or state.
                                      // In shadcn, we usually control 'open' state.
                                    }
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add new customer
                                </Button>
                              </CommandEmpty>
                              <CommandGroup>
                                {customers?.map((c) => (
                                  <CommandItem
                                    value={c.name}
                                    key={c.id}
                                    onSelect={() => {
                                      field.onChange(c.id.toString());
                                      setOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        c.id.toString() === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {c.name}
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
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: 1, unitPrice: 0, vatRate: 0.18 })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardContent className="p-4 grid gap-4 md:grid-cols-12 items-end">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Product</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                updatePrice(index, val);
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
                                    {p.name} (Stock: {p.stockQuantity})
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
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Price (UGX)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {!isInternal && (
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.vatRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">VAT Rate</FormLabel>
                              <Select
                                onValueChange={(val) => field.onChange(parseFloat(val))}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="0.18">18% (Standard)</SelectItem>
                                  <SelectItem value="0">0% (Exempt)</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <div className="md:col-span-2 flex justify-end">
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
                    <span>VAT Amount:</span>
                    <span className="font-mono">{vatAmount.toLocaleString()}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="font-mono text-primary">UGX {totalAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/sales")}>Cancel</Button>
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className={isInternal ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {id ? "Save Updates" : (isInternal ? "Create Internal Record" : "Create Official Invoice")}
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
              Confirm Owner-Only Transaction
            </AlertDialogTitle>
            <AlertDialogDescription>
              This transaction will be recorded as <strong>Internal</strong>.
              It will NOT appear in official VAT reports or employee views.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingValues && executeSubmit(pendingValues)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Confirm Internal Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
