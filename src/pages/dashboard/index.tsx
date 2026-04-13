import { ShoppingCart, Package, Users, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  { label: "Total orders", value: "—", icon: ShoppingCart, change: "" },
  { label: "Total products", value: "—", icon: Package, change: "" },
  { label: "Customers", value: "—", icon: Users, change: "" },
  { label: "Revenue", value: "—", icon: TrendingUp, change: "" },
]

export function DashboardPage() {
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
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Analytics dashboard — requires backend analytics endpoints
      </div>
    </div>
  )
}
