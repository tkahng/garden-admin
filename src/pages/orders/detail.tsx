import { useParams, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Ban } from "lucide-react"
import { toast } from "sonner"

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders/{id}", {
        params: { path: { id: id! } },
      })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/orders/{id}/cancel", {
        params: { path: { id: id! } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Order cancelled")
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", id] })
    },
    onError: () => toast.error("Failed to cancel order"),
  })

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  const o = order as Record<string, unknown> | undefined

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/orders">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Order #{String(o?.id ?? "").slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            {o?.createdAt ? new Date(o.createdAt as string).toLocaleString() : ""}
          </p>
        </div>
        {String(o?.status ?? "").toLowerCase() !== "cancelled" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            <Ban className="size-4 mr-2" />
            Cancel order
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{String(o?.status ?? "—")}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {o?.total != null ? `$${Number(o.total).toFixed(2)}` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{String(o?.customerEmail ?? o?.userId ?? "—")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
