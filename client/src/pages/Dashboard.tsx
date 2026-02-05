import { useDashboardStats } from "@/hooks/use-erp";
import { useAuth } from "@/hooks/use-auth";
import {
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Briefcase,
  Layers,
  FileText
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
  ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) return null;

  // Mock data for charts
  const chartData = stats.trendData || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isOwner ? "Owner Dashboard" : "My Dashboard"}
        </h2>
        <p className="text-muted-foreground">
          {isOwner
            ? "Overview of internal and official business performance."
            : "Overview of your assigned tasks and official records."}
        </p>
      </div>

      {/* === DASHBOARD CARDS === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Common: Official Sales */}
        <StatCard
          title="Official Sales"
          value={`UGX ${Number(stats.officialSales || 0).toLocaleString()}`}
          icon={ShoppingCart}
          description="VAT-compliant revenue"
        />

        {/* Employee Specific: VAT Collected */}
        {!isOwner && (
          <>
            <StatCard
              title="Inventory Value"
              value={`UGX ${Number(stats.totalPurchases || 0).toLocaleString()}`} // Using purchases as proxy for now
              icon={ShoppingBag}
              description="Total stock value"
            />
            {/* Outstanding Receivables placeholder */}
            <StatCard
              title="Receivables"
              value={`UGX ${Number(stats.receivables || 0).toLocaleString()}`}
              icon={FileText}
              description="Total outstanding sales"
            />
          </>
        )}

        {/* Owner Specific Cards */}
        {isOwner && (
          <>
            <StatCard
              title="Internal Sales"
              value={`UGX ${Number(stats.internalSales || 0).toLocaleString()}`}
              icon={Layers}
              description="Non-official revenue"
              className="border-orange-200 bg-orange-50/20"
            />

            <StatCard
              title="Combined Revenue"
              value={`UGX ${Number(stats.totalSales || 0).toLocaleString()}`}
              icon={Briefcase}
              description="Total business inflow"
              className="border-blue-200 bg-blue-50/20"
            />

            <StatCard
              title="VAT Payable"
              value={`UGX ${Number(stats.vatPayable || 0).toLocaleString()}`}
              icon={FileText}
              description="Output VAT - Input VAT"
            />

            <StatCard
              title="Receivables (AR)"
              value={`UGX ${Number(stats.receivables || 0).toLocaleString()}`}
              icon={FileText}
              description="Total outstanding sales"
              className="border-green-200 bg-green-50/20"
            />

            <StatCard
              title="Real Profit (Combined)"
              value={`UGX ${Number(stats.netProfit || 0).toLocaleString()}`}
              icon={TrendingUp}
              description="Actual business performance"
              highlight
            />
          </>
        )}
      </div>

      {/* === CHARTS & ALERTS === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview ({isOwner ? "Combined" : "Official"})</CardTitle>
            <CardDescription>
              Sales vs Purchases over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value) => [`UGX ${Number(value).toLocaleString()}`, '']}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="purchases" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Combined Alerts & Recent Activity */}
        <div className="col-span-3 space-y-4">
          {/* Low Stock Alerts */}
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="py-4">
              <CardTitle className="flex items-center text-sm text-orange-700">
                <AlertCircle className="mr-2 h-4 w-4" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2">
                {stats.lowStockItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">All stock levels are healthy.</p>
                ) : (
                  stats.lowStockItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border border-orange-100 shadow-xs text-xs">
                      <span className="font-medium truncate mr-2">{item.name}</span>
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-bold whitespace-nowrap">
                        {item.stockQuantity} Left
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-4">
                {stats.recentTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No recent activity.</p>
                ) : (
                  stats.recentTransactions.map((tx: any) => (
                    <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="font-bold">{tx.reference}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {tx.type === 'sale' ? 'Sale' : 'Purchase'} • {tx.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${tx.type === 'sale' ? 'text-green-600' : 'text-blue-600'}`}>
                          {tx.type === 'sale' ? '+' : '-'} UGX {Number(tx.amount).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {tx.date ? new Date(tx.date).toLocaleDateString() : 'Today'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, highlight, className }: any) {
  return (
    <Card className={`${highlight ? "bg-primary text-primary-foreground" : ""} ${className}`}>
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
