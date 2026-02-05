import { useState } from "react";
import { useExpenses, useCreateExpense } from "@/hooks/use-erp";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertExpenseSchema } from "@shared/schema";
import { Plus, Search, Receipt, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

// Define a form-specific schema to handle number inputs
const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().min(0, "Amount must be positive"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function Expenses() {
  const { data: expenses, isLoading } = useExpenses();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Manage operational costs and petty cash.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <ExpenseForm onSuccess={() => setIsOpen(false)} />
        </Dialog>
      </div>

      <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading expenses...</TableCell>
              </TableRow>
            ) : expenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Receipt className="h-8 w-8 mb-2 opacity-50" />
                    No expenses recorded.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              expenses?.map((expense) => (
                <TableRow
                  key={expense.id}
                  className={cn(
                    expense.type === "internal" ? "bg-orange-50/50 hover:bg-orange-50" : ""
                  )}
                >
                  <TableCell>
                    {expense.date ? new Date(expense.date).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.payee || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={expense.type === "internal" ? "destructive" : "outline"} className="uppercase text-[10px]">
                      {expense.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono">
                    {Number(expense.amount).toLocaleString()}
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

function ExpenseForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateExpense();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<any>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      category: "Utilities",
      amount: 0,
      type: "official",
      payee: "",
      receiptNumber: "",
    },
  });

  function handleSubmit(values: ExpenseFormValues) {
    // Convert numeric amount to string for API
    const payload = {
      ...values,
      amount: values.amount.toString()
    };

    if (isOwner && values.type === "internal") {
      setPendingValues(payload);
      setShowConfirm(true);
    } else {
      mutate(payload as any, { onSuccess });
    }
  }

  function executeCreate() {
    if (pendingValues) {
      mutate(pendingValues as any, { onSuccess });
    }
  }

  return (
    <>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Rent">Rent</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Electricity Bill for March" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (UGX)</FormLabel>
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="official">Official</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <FormField
              control={form.control}
              name="payee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payee (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Umeme" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
              <Button
                type="submit"
                disabled={isPending}
                className={form.watch("type") === "internal" ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                {isPending ? "Recording..." : "Save Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-orange-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Confirm Internal Expense
            </AlertDialogTitle>
            <AlertDialogDescription>
              This expense will be recorded as <strong>Internal</strong>.
              It will be excluded from official accounting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeCreate}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
