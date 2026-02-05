import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import {
  type InsertProduct,
  type InsertCustomer,
  type InsertSupplier,
  type CreateSaleRequest,
  type CreatePurchaseRequest,
  type InsertExpense,
  type DashboardStats
} from "@shared/schema";

// --- Products ---
export function useProducts() {
  return useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertProduct) => {
      const res = await fetch(api.products.create.path, {
        method: api.products.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create product");
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update product");
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, {
        method: api.products.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useAddStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const url = buildUrl(api.products.addStock.path, { id });
      const res = await fetch(url, {
        method: api.products.addStock.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add stock");
      return api.products.addStock.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

// --- Customers ---
export function useCustomers() {
  return useQuery({
    queryKey: [api.customers.list.path],
    queryFn: async () => {
      const res = await fetch(api.customers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await fetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

// --- Suppliers ---
export function useSuppliers() {
  return useQuery({
    queryKey: [api.suppliers.list.path],
    queryFn: async () => {
      const res = await fetch(api.suppliers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return api.suppliers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const res = await fetch(api.suppliers.create.path, {
        method: api.suppliers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create supplier");
      return api.suppliers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.suppliers.list.path] }),
  });
}

// --- Sales ---
export function useSales(page: number = 1, limit: number = 50) {
  return useQuery<{ data: any[], total: number, validPage: number }>({
    queryKey: [api.sales.list.path, page, limit],
    queryFn: async () => {
      const res = await fetch(`${api.sales.list.path}?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales");
      return await res.json();
    },
  });
}

export function useSale(id?: number) {
  return useQuery({
    queryKey: [api.sales.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(buildUrl(api.sales.get.path, { id }), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sale");
      return api.sales.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleRequest) => {
      const res = await fetch(api.sales.create.path, {
        method: api.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create sale");
      return api.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] }); // Stock update
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] }); // Stats update
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateSaleRequest }) => {
      const url = buildUrl(api.sales.update.path, { id });
      const res = await fetch(url, {
        method: api.sales.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update sale");
      return api.sales.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sales.delete.path, { id });
      const res = await fetch(url, {
        method: api.sales.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete sale");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

// --- Purchases ---
export function usePurchases(page: number = 1, limit: number = 50) {
  return useQuery<{ data: any[], total: number, validPage: number }>({
    queryKey: [api.purchases.list.path, page, limit],
    queryFn: async () => {
      const res = await fetch(`${api.purchases.list.path}?page=${page}&limit=${limit}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return await res.json();
    },
  });
}

export function usePurchase(id?: number) {
  return useQuery({
    queryKey: [api.purchases.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(buildUrl(api.purchases.get.path, { id }), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchase");
      return api.purchases.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseRequest) => {
      const res = await fetch(api.purchases.create.path, {
        method: api.purchases.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create purchase");
      return api.purchases.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.purchases.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] }); // Stock update
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreatePurchaseRequest }) => {
      const url = buildUrl(api.purchases.update.path, { id });
      const res = await fetch(url, {
        method: api.purchases.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update purchase");
      return api.purchases.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.purchases.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.purchases.delete.path, { id });
      const res = await fetch(url, {
        method: api.purchases.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete purchase");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.purchases.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

// --- Expenses ---
export function useExpenses() {
  return useQuery({
    queryKey: [api.expenses.list.path],
    queryFn: async () => {
      const res = await fetch(api.expenses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return api.expenses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExpense) => {
      const res = await fetch(api.expenses.create.path, {
        method: api.expenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return api.expenses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertExpense> }) => {
      const url = buildUrl(api.expenses.update.path, { id });
      const res = await fetch(url, {
        method: api.expenses.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update expense");
      return api.expenses.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.expenses.delete.path, { id });
      const res = await fetch(url, {
        method: api.expenses.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

// --- Dashboard ---
export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.dashboard.stats.responses[200].parse(await res.json());
    },
  });
}

// --- Audit Logs ---
export function useAuditLogs(entityType?: string, entityId?: number) {
  let path = api.audit.list.path;
  const params = new URLSearchParams();
  if (entityType) params.append("entityType", entityType);
  if (entityId) params.append("entityId", String(entityId));
  const queryStr = params.toString();
  const url = queryStr ? `${path}?${queryStr}` : path;

  return useQuery({
    queryKey: [api.audit.list.path, entityType, entityId],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return api.audit.list.responses[200].parse(await res.json());
    },
  });
}
