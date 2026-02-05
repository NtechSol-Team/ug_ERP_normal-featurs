import { z } from 'zod';
import {
  insertUserSchema,
  insertProductSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertSaleSchema,
  insertPurchaseSchema,
  insertExpenseSchema,
  users,
  products,
  customers,
  suppliers,
  sales,
  purchases,
  expenses,
  type DashboardStats
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
    addStock: {
      method: 'POST' as const,
      path: '/api/products/:id/stock',
      input: z.object({ amount: z.number() }),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers',
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
      },
    },
  },
  suppliers: {
    list: {
      method: 'GET' as const,
      path: '/api/suppliers',
      responses: {
        200: z.array(z.custom<typeof suppliers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/suppliers',
      input: insertSupplierSchema,
      responses: {
        201: z.custom<typeof suppliers.$inferSelect>(),
      },
    },
  },
  sales: {
    list: {
      method: 'GET' as const,
      path: '/api/sales',
      responses: {
        200: z.array(z.any()), // Complex type with items
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sales/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales',
      input: insertSaleSchema.extend({
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          unitPrice: z.number().optional(), // Can override
        }))
      }),
      responses: {
        201: z.custom<typeof sales.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sales/:id',
      input: insertSaleSchema.partial().extend({
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          unitPrice: z.number().optional(),
        })).optional()
      }),
      responses: {
        200: z.custom<typeof sales.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sales/:id',
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  purchases: {
    list: {
      method: 'GET' as const,
      path: '/api/purchases',
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/purchases/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/purchases',
      input: insertPurchaseSchema.extend({
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          unitCost: z.number().optional(),
        }))
      }),
      responses: {
        201: z.custom<typeof purchases.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/purchases/:id',
      input: insertPurchaseSchema.partial().extend({
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          unitCost: z.number().optional(),
        })).optional()
      }),
      responses: {
        200: z.custom<typeof purchases.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/purchases/:id',
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses',
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses',
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/expenses/:id',
      input: insertExpenseSchema.partial(),
      responses: {
        200: z.custom<typeof expenses.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id',
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.custom<DashboardStats>(),
      },
    },
  },
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-logs',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
