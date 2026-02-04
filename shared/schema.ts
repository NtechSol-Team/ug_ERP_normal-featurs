import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const userRoleEnum = ["owner", "employee"] as const;
export const transactionTypeEnum = ["official", "internal"] as const;
export const transactionStatusEnum = ["draft", "completed", "cancelled"] as const;

// === TABLE DEFINITIONS ===

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: userRoleEnum }).notNull().default("employee"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  description: text("description"),
  category: text("category"),
  unitPrice: numeric("unit_price").notNull(), // Selling price
  costPrice: numeric("cost_price"), // Buying price (Owner only visibility often)
  stockQuantity: integer("stock_quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").default(10),
  vatRate: numeric("vat_rate").default("18"), // Default 18% VAT
  isActive: boolean("is_active").default(true),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tinNumber: text("tin_number"), // Tax Identification Number
  createdAt: timestamp("created_at").defaultNow(),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tinNumber: text("tin_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales (Invoices)
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  type: text("type", { enum: transactionTypeEnum }).notNull().default("official"),
  status: text("status", { enum: transactionStatusEnum }).notNull().default("completed"),
  date: timestamp("date").defaultNow(),
  totalAmount: numeric("total_amount").notNull(),
  vatAmount: numeric("vat_amount").default("0"),
  subtotal: numeric("subtotal").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Sale Items
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
});

// Purchases (Bills)
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  billNumber: text("bill_number"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  type: text("type", { enum: transactionTypeEnum }).notNull().default("official"),
  status: text("status", { enum: transactionStatusEnum }).notNull().default("completed"),
  date: timestamp("date").defaultNow(),
  totalAmount: numeric("total_amount").notNull(),
  vatAmount: numeric("vat_amount").default("0"),
  subtotal: numeric("subtotal").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Purchase Items
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost").notNull(),
  totalCost: numeric("total_cost").notNull(),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount").notNull(),
  date: timestamp("date").defaultNow(),
  payee: text("payee"),
  type: text("type", { enum: transactionTypeEnum }).notNull().default("official"),
  receiptNumber: text("receipt_number"),
  createdBy: integer("created_by").references(() => users.id),
});

// === RELATIONS ===
export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
  creator: one(users, {
    fields: [sales.createdBy],
    references: [users.id],
  }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
  creator: one(users, {
    fields: [purchases.createdBy],
    references: [users.id],
  }),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, date: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, date: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, date: true });

// === EXPLICIT API CONTRACT TYPES ===
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type Expense = typeof expenses.$inferSelect;

// Request Types
export type LoginRequest = { username: string; password: string };

// Extended types for frontend with relations
export type SaleWithItems = Sale & { items: (SaleItem & { product: Product })[]; customer?: Customer };
export type PurchaseWithItems = Purchase & { items: (PurchaseItem & { product: Product })[]; supplier?: Supplier };

// Dashboard Stats Type
export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  netProfit: number;
  recentTransactions: any[];
  lowStockItems: Product[];
}

export type CreateSaleRequest = z.infer<typeof insertSaleSchema> & {
  items: Omit<z.infer<typeof insertSaleItemSchema>, "saleId">[];
};

export type CreatePurchaseRequest = z.infer<typeof insertPurchaseSchema> & {
  items: Omit<z.infer<typeof insertPurchaseItemSchema>, "purchaseId">[];
};
