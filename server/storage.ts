import { db } from "./db";
import {
  users, products, customers, suppliers, sales, saleItems, purchases, purchaseItems, expenses, auditLogs,
  type User, type InsertUser, type Product, type Customer, type Supplier,
  type Sale, type SaleItem, type Purchase, type PurchaseItem, type Expense,
  type CreateSaleRequest, type CreatePurchaseRequest, type DashboardStats, type AuditLog
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: Partial<Product>, userId: number): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>, userId: number): Promise<Product>;
  deleteProduct(id: number, userId: number): Promise<void>;
  addStock(id: number, amount: number, userId: number): Promise<Product>;

  // Customers & Suppliers
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: Partial<Customer>): Promise<Customer>;
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: Partial<Supplier>): Promise<Supplier>;

  // Transactions
  getSales(role: string): Promise<any[]>;
  getSale(id: number): Promise<any | undefined>;
  createSale(sale: CreateSaleRequest, userId: number): Promise<Sale>;
  updateSale(id: number, data: CreateSaleRequest, userId: number): Promise<Sale>;
  deleteSale(id: number, userId: number): Promise<void>;

  getPurchases(role: string): Promise<any[]>;
  getPurchase(id: number): Promise<any | undefined>;
  createPurchase(purchase: CreatePurchaseRequest, userId: number): Promise<Purchase>;
  updatePurchase(id: number, data: CreatePurchaseRequest, userId: number): Promise<Purchase>;
  deletePurchase(id: number, userId: number): Promise<void>;

  getExpenses(role: string): Promise<Expense[]>;
  createExpense(expense: Partial<Expense>, userId: number): Promise<Expense>;
  updateExpense(id: number, data: Partial<Expense>, userId: number): Promise<Expense>;
  deleteExpense(id: number, userId: number): Promise<void>;

  // Stats
  getDashboardStats(role: string): Promise<DashboardStats>;
  clearTransactions(): Promise<void>;

  // Audit Logs
  getAuditLogs(entityType?: string, entityId?: number): Promise<any[]>;
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

  async createProduct(product: Partial<Product>, userId: number): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    await this.createAuditLog(db, 'product', newProduct.id, 'created', { after: { ...newProduct } }, userId);
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>, userId: number): Promise<Product> {
    const oldProduct = await this.getProduct(id);
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    await this.createAuditLog(db, 'product', id, 'updated', {
      before: { ...oldProduct },
      after: { ...updated }
    }, userId);
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

  async getSale(id: number): Promise<any | undefined> {
    if (!id || isNaN(id)) return undefined;

    const results = await db.select({
      sale: sales,
      customer: customers
    })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.id, id));

    const saleData = results[0];
    if (!saleData) return undefined;

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));

    return {
      sale: saleData.sale,
      customer: saleData.customer,
      items: items
    };
  }

  async createSale(data: CreateSaleRequest, userId: number): Promise<Sale> {
    return await db.transaction(async (tx) => {
      let finalCustomerId = typeof data.customerId === 'number' ? data.customerId : null;

      // Handle inline customer creation
      if (typeof data.customerId === 'string' && data.customerId.trim() !== '') {
        const [newCustomer] = await tx.insert(customers).values({
          name: data.customerId,
        }).returning();
        finalCustomerId = newCustomer.id;
      }

      // 1. Create Sale Header
      const [sale] = await tx.insert(sales).values({
        ...data,
        customerId: finalCustomerId,
        createdBy: userId,
        date: data.date ? new Date(data.date) : new Date(),
        vatAmount: String(data.vatAmount || 0),
        subtotal: String(data.subtotal || 0),
        totalAmount: String(data.totalAmount || 0),
      } as any).returning();

      for (const item of data.items) {
        await tx.insert(saleItems).values({
          ...item,
          saleId: sale.id,
          unitPrice: String(item.unitPrice || 0),
          vatRate: String(item.vatRate || 0.18),
          totalPrice: String(Number(item.quantity) * Number(item.unitPrice || 0))
        } as any);

        // Decrease stock
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      await this.createAuditLog(tx, 'sale', sale.id, 'created', { after: { items: data.items } }, userId);
      this.invalidateCache();
      return sale;
    });
  }

  async updateSale(id: number, data: CreateSaleRequest, userId: number): Promise<Sale> {
    return await db.transaction(async (tx) => {
      const oldItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));
      for (const item of oldItems) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      await tx.delete(saleItems).where(eq(saleItems.saleId, id));

      let finalCustomerId = typeof data.customerId === 'number' ? data.customerId : null;
      if (typeof data.customerId === 'string' && data.customerId.trim() !== '') {
        const [newCustomer] = await tx.insert(customers).values({ name: data.customerId }).returning();
        finalCustomerId = newCustomer.id;
      }

      const [sale] = await tx.update(sales)
        .set({
          ...data,
          customerId: finalCustomerId,
          date: data.date ? new Date(data.date) : new Date(),
          vatAmount: String(data.vatAmount || 0),
          subtotal: String(data.subtotal || 0),
          totalAmount: String(data.totalAmount || 0),
        } as any)
        .where(eq(sales.id, id))
        .returning();

      for (const item of data.items) {
        await tx.insert(saleItems).values({
          ...item,
          saleId: sale.id,
          unitPrice: String(item.unitPrice || 0),
          vatRate: String(item.vatRate || 0.18),
          totalPrice: String(Number(item.quantity) * Number(item.unitPrice || 0))
        } as any);

        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      await this.createAuditLog(tx, 'sale', id, 'updated', {
        before: { items: oldItems },
        after: { items: data.items }
      }, userId);
      this.invalidateCache();
      return sale;
    });
  }

  async deleteSale(id: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const oldItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));
      for (const item of oldItems) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      await tx.delete(saleItems).where(eq(saleItems.saleId, id));
      await tx.delete(sales).where(eq(sales.id, id));
      await this.createAuditLog(tx, 'sale', id, 'deleted', { before: { items: oldItems } }, userId);
      this.invalidateCache();
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

  async getPurchase(id: number): Promise<any | undefined> {
    if (!id || isNaN(id)) return undefined;
    const results = await db.select({
      purchase: purchases,
      supplier: suppliers
    })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(eq(purchases.id, id));

    const purchaseData = results[0];
    if (!purchaseData) return undefined;

    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));

    return {
      purchase: purchaseData.purchase,
      supplier: purchaseData.supplier,
      items: items
    };
  }

  async createPurchase(data: CreatePurchaseRequest, userId: number): Promise<Purchase> {
    return await db.transaction(async (tx) => {
      let finalSupplierId = typeof data.supplierId === 'number' ? data.supplierId : null;

      // Handle inline supplier creation
      if (typeof data.supplierId === 'string' && data.supplierId.trim() !== '') {
        const [newSupplier] = await tx.insert(suppliers).values({
          name: data.supplierId,
        }).returning();
        finalSupplierId = newSupplier.id;
      }

      // 1. Create Purchase Header
      const [purchase] = await tx.insert(purchases).values({
        ...data,
        supplierId: finalSupplierId,
        createdBy: userId,
        date: data.date ? new Date(data.date) : new Date(),
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
          vatRate: String(item.vatRate || 0.18),
          totalCost: String(Number(item.quantity) * Number(item.unitCost || 0))
        } as any);

        // Increase stock
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      await this.createAuditLog(tx, 'purchase', purchase.id, 'created', { after: { items: data.items } }, userId);
      this.invalidateCache();
      return purchase;
    });
  }

  async updatePurchase(id: number, data: CreatePurchaseRequest, userId: number): Promise<Purchase> {
    return await db.transaction(async (tx) => {
      const oldItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      for (const item of oldItems) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));

      let finalSupplierId = typeof data.supplierId === 'number' ? data.supplierId : null;
      if (typeof data.supplierId === 'string' && data.supplierId.trim() !== '') {
        const [newSupplier] = await tx.insert(suppliers).values({ name: data.supplierId }).returning();
        finalSupplierId = newSupplier.id;
      }

      const [purchase] = await tx.update(purchases)
        .set({
          ...data,
          supplierId: finalSupplierId,
          date: data.date ? new Date(data.date) : new Date(),
          vatAmount: String(data.vatAmount || 0),
          subtotal: String(data.subtotal || 0),
          totalAmount: String(data.totalAmount || 0),
        } as any)
        .where(eq(purchases.id, id))
        .returning();

      for (const item of data.items) {
        await tx.insert(purchaseItems).values({
          ...item,
          purchaseId: purchase.id,
          unitCost: String(item.unitCost || 0),
          vatRate: String(item.vatRate || 0.18),
          totalCost: String(Number(item.quantity) * Number(item.unitCost || 0))
        } as any);

        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      await this.createAuditLog(tx, 'purchase', id, 'updated', {
        before: { items: oldItems },
        after: { items: data.items }
      }, userId);
      this.invalidateCache();
      return purchase;
    });
  }

  async deletePurchase(id: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const oldItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      for (const item of oldItems) {
        await tx.update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      await tx.delete(purchases).where(eq(purchases.id, id));
      await this.createAuditLog(tx, 'purchase', id, 'deleted', { before: { items: oldItems } }, userId);
      this.invalidateCache();
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
    this.invalidateCache();
    return newExpense;
  }

  async updateExpense(id: number, data: Partial<Expense>, userId: number): Promise<Expense> {
    const [expense] = await db.update(expenses)
      .set({ ...data, amount: String(data.amount || 0) } as any)
      .where(eq(expenses.id, id))
      .returning();
    await this.createAuditLog(db, 'expense', id, 'updated', data, userId);
    this.invalidateCache();
    return expense;
  }

  async deleteExpense(id: number, userId: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
    await this.createAuditLog(db, 'expense', id, 'deleted', null, userId);
    this.invalidateCache();
  }

  async deleteProduct(id: number, userId: number): Promise<void> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    await this.createAuditLog(db, 'product', id, 'deleted', null, userId);
  }

  async addStock(id: number, amount: number, userId: number): Promise<Product> {
    const oldProduct = await this.getProduct(id);
    const [product] = await db.update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${amount}` })
      .where(eq(products.id, id))
      .returning();
    await this.createAuditLog(db, 'product', id, 'stock_added', {
      before: { stockQuantity: oldProduct?.stockQuantity },
      after: { stockQuantity: product.stockQuantity },
      adjustment: amount
    }, userId);
    return product;
  }

  async getAuditLogs(entityType?: string, entityId?: number): Promise<any[]> {
    const query = db.select({
      log: auditLogs,
      user: users
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.timestamp));

    if (entityType) query.where(eq(auditLogs.entityType, entityType));
    if (entityId) query.where(eq(auditLogs.entityId, entityId));

    return await query;
  }

  private async createAuditLog(tx: any, entityType: string, entityId: number, action: string, changes: any, userId?: number) {
    await tx.insert(auditLogs).values({
      entityType,
      entityId,
      action,
      changes,
      userId: userId || null,
    });
  }

  // Dashboard Stats
  async clearTransactions(): Promise<void> {
    await db.delete(saleItems);
    await db.delete(sales);
    await db.delete(purchaseItems);
    await db.delete(purchases);
    await db.delete(expenses);
    this.invalidateCache();
  }

  private invalidateCache() {
    this.statsCache = {};
  }

  private statsCache: Record<string, { data: DashboardStats, timestamp: number }> = {};
  private readonly CACHE_TTL = 5000; // 5 seconds

  async getDashboardStats(role: string): Promise<DashboardStats> {
    const now = Date.now();
    if (this.statsCache[role] && (now - this.statsCache[role].timestamp < this.CACHE_TTL)) {
      return this.statsCache[role].data;
    }

    const statsRaw = await db.execute(sql`
      WITH 
        role_filter AS (SELECT ${role}::text as role),
        sales_agg AS (
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'official' THEN total_amount::numeric ELSE 0 END), 0) as official,
            COALESCE(SUM(CASE WHEN type = 'internal' THEN total_amount::numeric ELSE 0 END), 0) as internal,
            COALESCE(SUM(CASE WHEN type = 'official' THEN vat_amount::numeric ELSE 0 END), 0) as vat
          FROM sales
        ),
        purch_agg AS (
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'official' THEN total_amount::numeric ELSE 0 END), 0) as official,
            COALESCE(SUM(CASE WHEN type = 'internal' THEN total_amount::numeric ELSE 0 END), 0) as internal,
            COALESCE(SUM(CASE WHEN type = 'official' THEN vat_amount::numeric ELSE 0 END), 0) as vat
          FROM purchases
        ),
        exp_agg AS (
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'official' THEN amount::numeric ELSE 0 END), 0) as official,
            COALESCE(SUM(CASE WHEN type = 'internal' THEN amount::numeric ELSE 0 END), 0) as internal
          FROM expenses
        ),
        dates AS (
          SELECT generate_series(date_trunc('day', NOW()) - interval '6 days', date_trunc('day', NOW()), interval '1 day') as day
        ),
        daily_sales AS (
          SELECT date_trunc('day', date) as day, SUM(total_amount::numeric) as amount
          FROM sales 
          GROUP BY 1
        ),
        daily_purch AS (
          SELECT date_trunc('day', date) as day, SUM(total_amount::numeric) as amount
          FROM purchases 
          WHERE (type = 'official' OR (SELECT role FROM role_filter) = 'owner')
          GROUP BY 1
        ),
        recent_tx AS (
          SELECT COALESCE(json_agg(t), '[]'::json) as list FROM (
            SELECT id, date, 'sale' as category, total_amount as amount, invoice_number as reference, type
            FROM sales
            WHERE (type = 'official' OR (SELECT role FROM role_filter) = 'owner')
            UNION ALL
            SELECT id, date, 'purchase' as category, total_amount as amount, bill_number as reference, type
            FROM purchases
            WHERE (type = 'official' OR (SELECT role FROM role_filter) = 'owner')
            ORDER BY date DESC LIMIT 5
          ) t
        ),
        trend AS (
          SELECT COALESCE(json_agg(t), '[]'::json) as list FROM (
            SELECT 
              to_char(d.day, 'Dy') as name,
              COALESCE(s.amount, 0)::numeric as sales,
              COALESCE(p.amount, 0)::numeric as purchases
            FROM dates d
            LEFT JOIN daily_sales s ON d.day = s.day
            LEFT JOIN daily_purch p ON d.day = p.day
            ORDER BY d.day
          ) t
        ),
        low_stock AS (
          SELECT COALESCE(json_agg(p), '[]'::json) as list FROM (
            SELECT * FROM products WHERE stock_quantity <= reorder_level
          ) p
        )
      SELECT 
        s.official as off_sales, s.internal as int_sales, s.vat as s_vat,
        p.official as off_purch, p.internal as int_purch, p.vat as p_vat,
        e.official as off_exp, e.internal as int_exp,
        rtx.list as recent,
        tr.list as trend_data,
        ls.list as low_stock_items
      FROM sales_agg s, purch_agg p, exp_agg e, recent_tx rtx, trend tr, low_stock ls;
    `);

    const row = statsRaw.rows[0] as any;

    const offSales = Number(row.off_sales);
    const intSales = Number(row.int_sales);
    const offPurchases = Number(row.off_purch);
    const intPurchases = Number(row.int_purch);
    const offExpenses = Number(row.off_exp);
    const intExpenses = Number(row.int_exp);
    const sVat = Number(row.s_vat);
    const pVat = Number(row.p_vat);

    // Aggregate based on role
    let totalSales = offSales;
    let totalPurchases = offPurchases;
    let totalExpenses = offExpenses;

    if (role === 'owner') {
      totalSales += intSales;
      totalPurchases += intPurchases;
      totalExpenses += intExpenses;
    }

    const result: DashboardStats = {
      totalSales,
      totalPurchases,
      totalExpenses,
      netProfit: totalSales - totalPurchases - totalExpenses,
      officialSales: offSales,
      internalSales: intSales,
      officialPurchases: offPurchases,
      internalPurchases: intPurchases,
      officialExpenses: offExpenses,
      internalExpenses: intExpenses,
      vatPayable: sVat - pVat,
      receivables: offSales,
      payables: offPurchases,
      recentTransactions: row.recent || [],
      lowStockItems: row.low_stock_items || [],
      trendData: row.trend_data || [],
    };

    // Update Cache
    this.statsCache[role] = { data: result, timestamp: Date.now() };

    return result;
  }

}

export const storage = new DatabaseStorage();
