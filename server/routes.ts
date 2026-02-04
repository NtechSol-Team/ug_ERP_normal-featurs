import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { insertUserSchema } from "@shared/schema";
import MemoryStore from "memorystore";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTHENTICATION SETUP ===
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || user.password !== password) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // === SEED DATA ===
  await seedDatabase();

  // === API ROUTES ===
  
  // Auth
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Middleware to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.sendStatus(401);
  };

  // Products
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, requireAuth, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.sendStatus(404);
    res.json(product);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    const product = await storage.createProduct(req.body);
    res.status(201).json(product);
  });

  app.put(api.products.update.path, requireAuth, async (req, res) => {
    const product = await storage.updateProduct(Number(req.params.id), req.body);
    res.json(product);
  });

  // Customers & Suppliers
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });
  app.post(api.customers.create.path, requireAuth, async (req, res) => {
    const customer = await storage.createCustomer(req.body);
    res.status(201).json(customer);
  });

  app.get(api.suppliers.list.path, requireAuth, async (req, res) => {
    const suppliers = await storage.getSuppliers();
    res.json(suppliers);
  });
  app.post(api.suppliers.create.path, requireAuth, async (req, res) => {
    const supplier = await storage.createSupplier(req.body);
    res.status(201).json(supplier);
  });

  // Sales
  app.get(api.sales.list.path, requireAuth, async (req, res) => {
    const role = (req.user as any).role;
    const sales = await storage.getSales(role);
    res.json(sales);
  });
  
  app.post(api.sales.create.path, requireAuth, async (req, res) => {
    try {
      const sale = await storage.createSale(req.body, (req.user as any).id);
      res.status(201).json(sale);
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: "Failed to create sale" });
    }
  });

  // Purchases
  app.get(api.purchases.list.path, requireAuth, async (req, res) => {
    const role = (req.user as any).role;
    const purchases = await storage.getPurchases(role);
    res.json(purchases);
  });

  app.post(api.purchases.create.path, requireAuth, async (req, res) => {
    try {
      const purchase = await storage.createPurchase(req.body, (req.user as any).id);
      res.status(201).json(purchase);
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: "Failed to create purchase" });
    }
  });

  // Expenses
  app.get(api.expenses.list.path, requireAuth, async (req, res) => {
    const role = (req.user as any).role;
    const expenses = await storage.getExpenses(role);
    res.json(expenses);
  });

  app.post(api.expenses.create.path, requireAuth, async (req, res) => {
    const expense = await storage.createExpense(req.body, (req.user as any).id);
    res.status(201).json(expense);
  });

  // Stats
  app.get(api.dashboard.stats.path, requireAuth, async (req, res) => {
    const role = (req.user as any).role;
    const stats = await storage.getDashboardStats(role);
    res.json(stats);
  });

  return httpServer;
}

async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("owner@example.com");
  if (!existingUser) {
    // 1. Create Users
    await storage.createUser({
      username: "owner@example.com",
      password: "owner123",
      name: "John Mukasa",
      role: "owner"
    });
    
    await storage.createUser({
      username: "staff@example.com",
      password: "staff123",
      name: "Sarah Staff",
      role: "employee"
    });

    // 2. Create Initial Data
    const p1 = await storage.createProduct({
      name: "Cement (50kg Bag)",
      sku: "CEM001",
      unitPrice: "35000",
      costPrice: "28000",
      stockQuantity: 500,
      category: "Construction",
    });

    const p2 = await storage.createProduct({
      name: "Iron Sheets (Gauge 30)",
      sku: "IRS001",
      unitPrice: "45000",
      costPrice: "38000",
      stockQuantity: 200,
      category: "Construction",
    });

    await storage.createCustomer({
      name: "Kampala Builders Ltd",
      email: "info@kampalabuilders.com",
      phone: "0772123456",
      tinNumber: "1000123456"
    });
    
    await storage.createSupplier({
      name: "Tororo Cement Factory",
      email: "sales@tororo.co.ug",
      phone: "0752123456",
      tinNumber: "1000987654"
    });

    console.log("Database seeded successfully!");
  }
}
