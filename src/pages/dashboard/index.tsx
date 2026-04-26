import { useState, useMemo } from "react"
import { ShoppingCart, Users, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { apiClient, getAuthToken } from "@/api/client"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

// ── Date range presets ────────────────────────────────────────────────────────

type Preset = "today" | "7d" | "30d" | "90d" | "thisMonth" | "lastMonth"

const PRESETS: { label: string; value: Preset }[] = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
]

function rangeForPreset(preset: Preset): { from: Date; to: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (preset) {
    case "today":
      return { from: today, to: now }
    case "7d":
      return { from: new Date(now.getTime() - 7 * 86_400_000), to: now }
    case "30d":
      return { from: new Date(now.getTime() - 30 * 86_400_000), to: now }
    case "90d":
      return { from: new Date(now.getTime() - 90 * 86_400_000), to: now }
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start, to: end }
    }
  }
}

function previousRange(from: Date, to: Date): { from: Date; to: Date } {
  const duration = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - duration), to: from }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, currency = false) {
  if (n == null) return "—"
  return currency
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : n.toLocaleString("en-US")
}

function pctDelta(current: number | null | undefined, prev: number | null | undefined) {
  if (current == null || prev == null || prev === 0) return null
  return ((current - prev) / prev) * 100
}

async function fetchJson<T>(path: string): Promise<T> {
  const token = getAuthToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data: T }
  return json.data
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  icon: React.ElementType
  value: string
  pct: number | null
  loading: boolean
}

function StatCard({ label, icon: Icon, value, pct, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? <span className="text-muted-foreground">…</span> : value}
        </div>
        {!loading && pct != null && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", pct >= 0 ? "text-green-600" : "text-red-500")}>
            {pct >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(pct).toFixed(1)}% vs prev period
          </p>
        )}
        {!loading && pct == null && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="size-3" />
            No prior data
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TsPoint = { date: string; orderCount: number; revenue: number }
type TopProduct = { productId: string; title: string; handle: string; orderCount: number; revenue: number }
type TopCustomer = { userId: string; email: string; firstName: string; lastName: string; orderCount: number; revenue: number }

export function DashboardPage() {
  const [preset, setPreset] = useState<Preset>("30d")

  const { from, to } = useMemo(() => rangeForPreset(preset), [preset])
  const prev = useMemo(() => previousRange(from, to), [from, to])

  const fromIso = from.toISOString()
  const toIso = to.toISOString()
  const prevFromIso = prev.from.toISOString()
  const prevToIso = prev.to.toISOString()

  const { data: curr, isLoading: currLoading } = useQuery({
    queryKey: ["admin", "stats", fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/stats", {
        params: { query: { from: fromIso, to: toIso } },
      })
      if (error) throw error
      return (data as { data?: Record<string, unknown> })?.data
    },
  })

  const { data: prevData } = useQuery({
    queryKey: ["admin", "stats", prevFromIso, prevToIso],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/stats", {
        params: { query: { from: prevFromIso, to: prevToIso } },
      })
      if (error) throw error
      return (data as { data?: Record<string, unknown> })?.data
    },
  })

  const { data: timeSeries, isLoading: tsLoading } = useQuery<TsPoint[]>({
    queryKey: ["admin", "stats", "timeSeries", fromIso, toIso],
    queryFn: () => fetchJson<TsPoint[]>(`/api/v1/admin/stats/time-series?from=${fromIso}&to=${toIso}`),
  })

  const { data: topProducts, isLoading: tpLoading } = useQuery<TopProduct[]>({
    queryKey: ["admin", "stats", "topProducts", fromIso, toIso],
    queryFn: () => fetchJson<TopProduct[]>(`/api/v1/admin/stats/top-products?from=${fromIso}&to=${toIso}&limit=5`),
  })

  const { data: topCustomers, isLoading: tcLoading } = useQuery<TopCustomer[]>({
    queryKey: ["admin", "stats", "topCustomers", fromIso, toIso],
    queryFn: () => fetchJson<TopCustomer[]>(`/api/v1/admin/stats/top-customers?from=${fromIso}&to=${toIso}&limit=5`),
  })

  const orderCount = curr?.orderCount as number | undefined
  const revenue = curr?.totalRevenue as number | undefined
  const aov = curr?.averageOrderValue as number | undefined
  const newCustomers = curr?.newCustomerCount as number | undefined

  const prevOrderCount = prevData?.orderCount as number | undefined
  const prevRevenue = prevData?.totalRevenue as number | undefined
  const prevAov = prevData?.averageOrderValue as number | undefined
  const prevNewCustomers = prevData?.newCustomerCount as number | undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders" icon={ShoppingCart} value={fmt(orderCount)} pct={pctDelta(orderCount, prevOrderCount)} loading={currLoading} />
        <StatCard label="Revenue" icon={TrendingUp} value={fmt(revenue, true)} pct={pctDelta(revenue, prevRevenue)} loading={currLoading} />
        <StatCard label="Avg. order value" icon={BarChart3} value={fmt(aov, true)} pct={pctDelta(aov, prevAov)} loading={currLoading} />
        <StatCard label="New customers" icon={Users} value={fmt(newCustomers)} pct={pctDelta(newCustomers, prevNewCustomers)} loading={currLoading} />
      </div>

      {/* Line charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue over time</CardTitle>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : !timeSeries?.length ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                    formatter={(v: number) => [
                      `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      "Revenue",
                    ]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders over time</CardTitle>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : !timeSeries?.length ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                    formatter={(v: number) => [v, "Orders"]}
                  />
                  <Line type="monotone" dataKey="orderCount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products + top customers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tpLoading ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>
            ) : !topProducts?.length ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">No sales in this period</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-6 py-2 text-left font-medium w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium">Product</th>
                    <th className="px-3 py-2 text-right font-medium">Orders</th>
                    <th className="px-6 py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.productId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3 font-medium max-w-[160px] truncate">{p.title}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.orderCount.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">{fmt(p.revenue, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tcLoading ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>
            ) : !topCustomers?.length ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">No customer orders in this period</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-6 py-2 text-left font-medium w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-right font-medium">Orders</th>
                    <th className="px-6 py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={c.userId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <div className="font-medium truncate">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{c.orderCount.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">{fmt(c.revenue, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
