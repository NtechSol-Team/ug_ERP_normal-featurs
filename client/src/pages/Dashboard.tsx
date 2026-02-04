import { useDashboardStats } from "@/hooks/use-erp";
import { useAuth } from "@/hooks/use-auth";
import { 
  DollarSign, 
  ShoppingCart, 
  ShoppingBag, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) return null;

  // Mock data for charts (backend sends aggregated stats, but we need time series for charts)
  // In a real app, backend would send time-series data
  const chartData = [
    { name: 'Mon', sales: 4000, purchases: 2400 },
    { name: 'Tue', sales: 3000, purchases: 1398 },
    { name: 'Wed', sales: 2000, purchases: 9800 },
    { name: 'Thu', sales: 2780, purchases: 3908 },
    { name: 'Fri', sales: 1890, purchases: 4800 },
    { name: 'Sat', sales: 2390, purchases: 3800 },
    { name: 'Sun', sales: 3490, purchases: 4300 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your business performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={`UGX ${Number(stats.totalSales).toLocaleString()}`}
          icon={ShoppingCart}
          description="Total revenue from sales"
        />
        <StatCard
          title="Total Purchases"
          value={`UGX ${Number(stats.totalPurchases).toLocaleString()}`}
          icon={ShoppingBag}
          description="Total cost of inventory"
        />
        <StatCard
          title="Expenses"
          value={`UGX ${Number(stats.totalExpenses).toLocaleString()}`}
          icon={TrendingUp}
          description="Operating expenses"
        />
        {isOwner && (
          <StatCard
            title="Net Profit"
            value={`UGX ${Number(stats.netProfit).toLocaleString()}`}
            icon={DollarSign}
            description="Sales - (Purchases + Expenses)"
            highlight
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Sales vs Purchases over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `UGX${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value) => [`UGX ${value}`, '']}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="purchases" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
              ) : (
                stats.recentTransactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{tx.description || `Invoice #${tx.invoiceNumber}`}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                    <div className={`font-bold text-sm ${tx.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'sale' ? '+' : '-'} UGX {Number(tx.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <AlertCircle className="mr-2 h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                    {item.stockQuantity} left
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, highlight }: any) {
  return (
    <Card className={highlight ? "bg-primary text-primary-foreground" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
