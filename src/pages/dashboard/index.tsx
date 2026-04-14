import { ShoppingCart, Users, TrendingUp, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"

type Stats = components["schemas"]["StatsResponse"]

function fmt(n: number | undefined, currency = false) {
  if (n == null) return "—"
  return currency
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : n.toLocaleString("en-US")
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const to = new Date().toISOString()
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await apiClient.GET("/api/v1/admin/stats", {
        params: { query: { from, to } },
      })
      if (error) throw error
      return (data as { data?: Stats } | undefined)?.data
    },
  })

  const stats = [
    {
      label: "Total orders",
      value: fmt(data?.orderCount),
      icon: ShoppingCart,
      sub: data?.from ? `Since ${new Date(data.from).toLocaleDateString()}` : "",
    },
    {
      label: "Revenue",
      value: fmt(data?.totalRevenue, true),
      icon: TrendingUp,
      sub: "",
    },
    {
      label: "Avg. order value",
      value: fmt(data?.averageOrderValue, true),
      icon: BarChart3,
      sub: "",
    },
    {
      label: "New customers",
      value: fmt(data?.newCustomerCount),
      icon: Users,
      sub: "",
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <span className="text-muted-foreground">…</span> : stat.value}
              </div>
              {stat.sub && <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
