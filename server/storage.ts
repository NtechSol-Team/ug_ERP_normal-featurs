import { db } from "./db";
import {
  users, products, customers, suppliers, sales, saleItems, purchases, purchaseItems, expenses,
  type User, type InsertUser, type Product, type Customer, type Supplier, 
  type Sale, type SaleItem, type Purchase, type PurchaseItem, type Expense,
  type CreateSaleRequest, type CreatePurchaseRequest, type DashboardStats
} from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: Partial<Product>): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product>;

  // Customers & Suppliers
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: Partial<Customer>): Promise<Customer>;
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: Partial<Supplier>): Promise<Supplier>;

  // Transactions
  getSales(role: string): Promise<any[]>;
  createSale(sale: CreateSaleRequest, userId: number): Promise<Sale>;
  getPurchases(role: string): Promise<any[]>;
  createPurchase(purchase: CreatePurchaseRequest, userId: number): Promise<Purchase>;
  getExpenses(role: string): Promise<Expense[]>;
  createExpense(expense: Partial<Expense>, userId: number): Promise<Expense>;

  // Stats
  getDashboardStats(role: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  // Customer/Supplier methods
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer as any).returning();
    return newCustomer;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier as any).returning();
    return newSupplier;
  }

  // Sales
  async getSales(role: string): Promise<any[]> {
    const query = db.select({
      sale: sales,
      customer: customers,
      items: sql<any>`json_agg(json_build_object('quantity', ${saleItems.quantity}, 'product', ${products.name}))`
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
    .leftJoin(products, eq(saleItems.productId, products.id))
    .groupBy(sales.id, customers.id)
    .orderBy(desc(sales.date));

    if (role !== 'owner') {
      query.where(eq(sales.type, 'official'));
    }

    return await query;
  }

  async createSale(data: CreateSaleRequest, userId: number): Promise<Sale> {
    return await db.transaction(async (tx) => {
      // 1. Create Sale Header
      const [sale] = await tx.insert(sales).values({
        ...data,
        customerId: data.customerId ?? null,
        createdBy: userId,
        date: new Date(),
        vatAmount: String(data.vatAmount || 0),
        subtotal: String(data.subtotal || 0),
        totalAmount: String(data.totalAmount || 0),
      } as any).returning();

      // 2. Create Sale Items & Update Stock
      for (const item of data.items) {
        await tx.insert(saleItems).values({
          ...item,
          saleId: sale.id,
          unitPrice: String(item.unitPrice || 0),
          totalPrice: String(Number(item.quantity) * Number(item.unitPrice || 0))
        } as any);

        // Decrease stock
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      return sale;
    });
  }

  // Purchases
  async getPurchases(role: string): Promise<any[]> {
    const query = db.select({
      purchase: purchases,
      supplier: suppliers
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .orderBy(desc(purchases.date));

    if (role !== 'owner') {
      query.where(eq(purchases.type, 'official'));
    }

    return await query;
  }

  async createPurchase(data: CreatePurchaseRequest, userId: number): Promise<Purchase> {
    return await db.transaction(async (tx) => {
      // 1. Create Purchase Header
      const [purchase] = await tx.insert(purchases).values({
        ...data,
        supplierId: data.supplierId ?? null,
        createdBy: userId,
        date: new Date(),
        vatAmount: String(data.vatAmount || 0),
        subtotal: String(data.subtotal || 0),
        totalAmount: String(data.totalAmount || 0),
      } as any).returning();

      // 2. Create Purchase Items & Update Stock
      for (const item of data.items) {
        await tx.insert(purchaseItems).values({
          ...item,
          purchaseId: purchase.id,
          unitCost: String(item.unitCost || 0),
          totalCost: String(Number(item.quantity) * Number(item.unitCost || 0))
        } as any);

        // Increase stock
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      return purchase;
    });
  }

  // Expenses
  async getExpenses(role: string): Promise<Expense[]> {
    const query = db.select().from(expenses).orderBy(desc(expenses.date));
    
    if (role !== 'owner') {
      query.where(eq(expenses.type, 'official'));
    }

    return await query;
  }

  async createExpense(expense: Partial<Expense>, userId: number): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values({
      ...expense,
      createdBy: userId,
      amount: String(expense.amount || 0)
    } as any).returning();
    return newExpense;
  }

  // Dashboard Stats
  async getDashboardStats(role: string): Promise<DashboardStats> {
    // Helper to sum columns conditionally
    const sumAmount = async (table: any, typeCol: any) => {
      const query = db.select({ total: sql<string>`sum(${table.totalAmount})` }).from(table);
      if (role !== 'owner') query.where(eq(typeCol, 'official'));
      const [res] = await query;
      return Number(res?.total || 0);
    };
    
    const sumExpense = async () => {
      const query = db.select({ total: sql<string>`sum(${expenses.amount})` }).from(expenses);
      if (role !== 'owner') query.where(eq(expenses.type, 'official'));
      const [res] = await query;
      return Number(res?.total || 0);
    };

    const totalSales = await sumAmount(sales, sales.type);
    const totalPurchases = await sumAmount(purchases, purchases.type);
    const totalExpenses = await sumExpense();

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      netProfit: totalSales - totalPurchases - totalExpenses,
      recentTransactions: [], // Populate if needed
      lowStockItems: await db.select().from(products).where(sql`${products.stockQuantity} <= ${products.reorderLevel}`),
    };
  }
}

export const storage = new DatabaseStorage();
