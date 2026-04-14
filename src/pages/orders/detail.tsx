import { useState } from "react"
import { useParams, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Ban, RefreshCcw, Plus } from "lucide-react"
import { toast } from "sonner"

type Order = Record<string, unknown>
type Fulfillment = components["schemas"]["FulfillmentResponse"]
type OrderEvent = components["schemas"]["OrderEventResponse"]
type CreateFulfillment = components["schemas"]["CreateFulfillmentRequest"]

const EVENT_LABELS: Record<string, string> = {
  ORDER_PLACED: "Order placed",
  PAYMENT_CONFIRMED: "Payment confirmed",
  ORDER_CANCELLED: "Order cancelled",
  ORDER_REFUNDED: "Order refunded",
  ADMIN_REFUND_ISSUED: "Refund issued by admin",
  DISCOUNT_APPLIED: "Discount applied",
  GIFT_CARD_APPLIED: "Gift card applied",
  FULFILLMENT_CREATED: "Fulfillment created",
  FULFILLMENT_UPDATED: "Fulfillment updated",
  NOTE_ADDED: "Note added",
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [fulfillOpen, setFulfillOpen] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [fulfillForm, setFulfillForm] = useState<Partial<CreateFulfillment>>({})

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders/{id}", {
        params: { path: { id: id! } },
      })
      if (error) throw error
      return (data as { data?: Order } | undefined)?.data
    },
    enabled: !!id,
  })

  const { data: fulfillmentsData } = useQuery({
    queryKey: ["admin", "orders", id, "fulfillments"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/admin/orders/{orderId}/fulfillments",
        { params: { path: { orderId: id! } } }
      )
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: eventsData } = useQuery({
    queryKey: ["admin", "orders", id, "events"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/admin/orders/{orderId}/events",
        { params: { path: { orderId: id! } } }
      )
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const fulfillments: Fulfillment[] =
    (fulfillmentsData as { data?: Fulfillment[] } | undefined)?.data ?? []
  const events: OrderEvent[] =
    (eventsData as { data?: OrderEvent[] } | undefined)?.data ?? []

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/orders/{id}/cancel", {
        params: { path: { id: id! } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Order cancelled")
      qc.invalidateQueries({ queryKey: ["admin", "orders", id] })
      qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
    },
    onError: () => toast.error("Failed to cancel order"),
  })

  const refundMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{id}/refund", {
        params: { path: { id: id! } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Refund issued")
      qc.invalidateQueries({ queryKey: ["admin", "orders", id] })
      qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
    },
    onError: () => toast.error("Failed to issue refund"),
  })

  const fulfillMutation = useMutation({
    mutationFn: async (body: CreateFulfillment) => {
      const { error } = await apiClient.POST(
        "/api/v1/admin/orders/{orderId}/fulfillments",
        { params: { query: { admin: {} }, path: { orderId: id! } }, body }
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Fulfillment created")
      qc.invalidateQueries({ queryKey: ["admin", "orders", id, "fulfillments"] })
      qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setFulfillOpen(false)
      setFulfillForm({})
    },
    onError: () => toast.error("Failed to create fulfillment"),
  })

  const noteMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await apiClient.POST(
        "/api/v1/admin/orders/{orderId}/events",
        { params: { query: { admin: {} }, path: { orderId: id! } }, body: { message } }
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Note added")
      qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setNoteText("")
    },
    onError: () => toast.error("Failed to add note"),
  })

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>
  const o = order as Order | undefined
  const status = String(o?.status ?? "").toLowerCase()

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/orders"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            Order #{String(o?.id ?? "").slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {o?.createdAt ? new Date(o.createdAt as string).toLocaleString() : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <Ban className="size-4 mr-2" />
              Cancel
            </Button>
          )}
          {status === "paid" || status === "completed" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending}
            >
              <RefreshCcw className="size-4 mr-2" />
              Refund
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setFulfillOpen(true)}>
            <Plus className="size-4 mr-2" />
            Fulfill
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{String(o?.status ?? "—")}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {o?.total != null ? `$${Number(o.total).toFixed(2)}` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm truncate">
            {String(o?.customerEmail ?? o?.userId ?? "—")}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fulfillments">
        <TabsList>
          <TabsTrigger value="fulfillments">
            Fulfillments ({fulfillments.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fulfillments" className="space-y-3 mt-4">
          {fulfillments.length === 0 && (
            <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
              No fulfillments yet.
            </div>
          )}
          {fulfillments.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Fulfillment #{String(f.id).slice(0, 8)}
                  </CardTitle>
                  <Badge variant={
                    f.status === "DELIVERED" ? "default" :
                    f.status === "SHIPPED" ? "secondary" :
                    f.status === "CANCELLED" ? "destructive" : "outline"
                  }>
                    {f.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {f.trackingNumber && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Tracking</span>
                    {f.trackingUrl ? (
                      <a href={f.trackingUrl} target="_blank" rel="noreferrer" className="underline">
                        {f.trackingNumber}
                      </a>
                    ) : (
                      <span>{f.trackingNumber}</span>
                    )}
                    {f.trackingCompany && (
                      <span className="text-muted-foreground">via {f.trackingCompany}</span>
                    )}
                  </div>
                )}
                {f.note && <p className="text-muted-foreground">{f.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-4">
          {/* Add note */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note..."
              className="resize-none h-9 min-h-0 py-2"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={1}
            />
            <Button
              size="sm"
              onClick={() => noteText.trim() && noteMutation.mutate(noteText.trim())}
              disabled={noteMutation.isPending || !noteText.trim()}
            >
              Add note
            </Button>
          </div>

          {/* Events */}
          <div className="space-y-2">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
            {[...events].reverse().map((e) => (
              <div key={e.id} className="flex gap-3 text-sm">
                <div className="mt-1 size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {EVENT_LABELS[e.type ?? ""] ?? e.type}
                    </span>
                    {e.authorName && (
                      <span className="text-muted-foreground text-xs">by {e.authorName}</span>
                    )}
                  </div>
                  {e.message && <p className="text-muted-foreground mt-0.5">{e.message}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create fulfillment dialog */}
      <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create fulfillment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tracking number</Label>
              <Input
                placeholder="1Z999AA10123456784"
                value={fulfillForm.trackingNumber ?? ""}
                onChange={(e) => setFulfillForm((f) => ({ ...f, trackingNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Carrier</Label>
                <Input
                  placeholder="UPS"
                  value={fulfillForm.trackingCompany ?? ""}
                  onChange={(e) =>
                    setFulfillForm((f) => ({ ...f, trackingCompany: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tracking URL</Label>
                <Input
                  placeholder="https://..."
                  value={fulfillForm.trackingUrl ?? ""}
                  onChange={(e) =>
                    setFulfillForm((f) => ({ ...f, trackingUrl: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                placeholder="Optional"
                value={fulfillForm.note ?? ""}
                onChange={(e) => setFulfillForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                fulfillMutation.mutate({ items: [], ...fulfillForm } as CreateFulfillment)
              }
              disabled={fulfillMutation.isPending}
            >
              Create fulfillment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
