import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Ban, ImageIcon, Pencil, RefreshCcw, Plus, Package } from "lucide-react"
import { toast } from "sonner"

type Order = components["schemas"]["OrderResponse"]
type OrderItem = components["schemas"]["OrderItemResponse"]
type Fulfillment = components["schemas"]["FulfillmentResponse"]
type OrderEvent = components["schemas"]["OrderEventResponse"]
type CreateFulfillment = components["schemas"]["CreateFulfillmentRequest"]
type UpdateFulfillment = components["schemas"]["UpdateFulfillmentRequest"]

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

const FULFILLMENT_STATUSES = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"] as const

function statusVariant(status: string) {
  switch (status) {
    case "PAID": case "FULFILLED": return "default"
    case "PARTIALLY_FULFILLED": case "PENDING_PAYMENT": return "secondary"
    case "CANCELLED": return "destructive"
    case "REFUNDED": return "outline"
    default: return "outline"
  }
}

function statusLabel(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function fulfillmentStatusVariant(s: string) {
  switch (s) {
    case "DELIVERED": return "default"
    case "SHIPPED": return "secondary"
    case "CANCELLED": return "destructive"
    default: return "outline"
  }
}

export function OrderDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()

  // Create fulfillment state
  const [fulfillOpen, setFulfillOpen] = useState(false)
  const [fulfillForm, setFulfillForm] = useState<Omit<CreateFulfillment, "items">>({})
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [itemQtys, setItemQtys] = useState<Record<string, number>>({})

  // Update fulfillment state
  const [editFulfillment, setEditFulfillment] = useState<Fulfillment | null>(null)
  const [editFulfillForm, setEditFulfillForm] = useState<UpdateFulfillment>({})

  // Admin notes / cancel / refund confirms
  const [editNotes, setEditNotes] = useState(false)
  const [adminNotesForm, setAdminNotesForm] = useState("")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [noteText, setNoteText] = useState("")

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "orders", id] })
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return data?.data as Order | undefined
    },
    enabled: !!id,
  })

  const { data: fulfillmentsData } = useQuery({
    queryKey: ["admin", "orders", id, "fulfillments"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders/{orderId}/fulfillments", {
        params: { path: { orderId: id } },
      })
      if (error) throw error
      return (data as { data?: Fulfillment[] } | undefined)?.data ?? []
    },
    enabled: !!id,
  })

  const { data: eventsData } = useQuery({
    queryKey: ["admin", "orders", id, "events"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders/{orderId}/events", {
        params: { path: { orderId: id } },
      })
      if (error) throw error
      return (data as { data?: OrderEvent[] } | undefined)?.data ?? []
    },
    enabled: !!id,
  })

  const fulfillments: Fulfillment[] = fulfillmentsData ?? []
  const events: OrderEvent[] = eventsData ?? []

  // ── Mutations ─────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/orders/{id}/cancel", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Order cancelled")
      invalidate()
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setCancelOpen(false)
    },
    onError: () => toast.error("Failed to cancel order"),
  })

  const refundMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{id}/refund", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Refund issued")
      invalidate()
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setRefundOpen(false)
    },
    onError: () => toast.error("Failed to issue refund"),
  })

  const updateOrderMutation = useMutation({
    mutationFn: async (body: { adminNotes?: string; shippingAddress?: string }) => {
      const { error } = await apiClient.PUT("/api/v1/admin/orders/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Order updated")
      invalidate()
      setEditNotes(false)
    },
    onError: () => toast.error("Failed to update order"),
  })

  const fulfillMutation = useMutation({
    mutationFn: async (body: CreateFulfillment) => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{orderId}/fulfillments", {
        params: { query: { admin: {} as never }, path: { orderId: id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Fulfillment created")
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "fulfillments"] })
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      invalidate()
      setFulfillOpen(false)
      setFulfillForm({})
      setSelectedItemIds(new Set())
      setItemQtys({})
    },
    onError: () => toast.error("Failed to create fulfillment"),
  })

  const updateFulfillmentMutation = useMutation({
    mutationFn: async ({ fulfillmentId, body }: { fulfillmentId: string; body: UpdateFulfillment }) => {
      const { error } = await apiClient.PUT(
        "/api/v1/admin/orders/{orderId}/fulfillments/{fulfillmentId}",
        {
          params: { path: { orderId: id, fulfillmentId } },
          body,
        }
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Fulfillment updated")
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "fulfillments"] })
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setEditFulfillment(null)
    },
    onError: () => toast.error("Failed to update fulfillment"),
  })

  const noteMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{orderId}/events", {
        params: { query: { admin: {} as never }, path: { orderId: id } },
        body: { message },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Note added")
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setNoteText("")
    },
    onError: () => toast.error("Failed to add note"),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────

  function openCreateFulfillment() {
    setFulfillForm({})
    setSelectedItemIds(new Set())
    setItemQtys({})
    setFulfillOpen(true)
  }

  function openEditFulfillment(f: Fulfillment) {
    setEditFulfillment(f)
    setEditFulfillForm({
      status: f.status,
      trackingNumber: f.trackingNumber ?? "",
      trackingCompany: f.trackingCompany ?? "",
      trackingUrl: f.trackingUrl ?? "",
      note: f.note ?? "",
    })
  }

  function handleCreateFulfillment() {
    const items = Array.from(selectedItemIds).map((orderItemId) => ({
      orderItemId,
      quantity: itemQtys[orderItemId] ?? 1,
    }))
    fulfillMutation.mutate({ ...fulfillForm, items })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <div className="text-muted-foreground p-4">Loading...</div>
  if (!order) return <div className="text-muted-foreground p-4">Order not found</div>

  const o = order
  const items: OrderItem[] = o.items ?? []
  const canCancel = o.status !== "CANCELLED" && o.status !== "REFUNDED"
  const canRefund = o.status === "PAID" || o.status === "PARTIALLY_FULFILLED" || o.status === "FULFILLED"
  const canFulfill = o.status === "PAID" || o.status === "PARTIALLY_FULFILLED"

  const subtotal = items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * (i.quantity ?? 0), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/orders"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono">
              #{String(o.id ?? "").slice(0, 8).toUpperCase()}
            </h1>
            <Badge variant={statusVariant(o.status ?? "")}>
              {statusLabel(o.status ?? "")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canFulfill && (
            <Button size="sm" onClick={openCreateFulfillment}>
              <Package className="size-4 mr-2" />
              Fulfill items
            </Button>
          )}
          {canRefund && (
            <Button variant="outline" size="sm" onClick={() => setRefundOpen(true)} disabled={refundMutation.isPending}>
              <RefreshCcw className="size-4 mr-2" />
              Refund
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} disabled={cancelMutation.isPending}>
              <Ban className="size-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: items + fulfillments + timeline */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 pb-6">No items.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="size-8 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                              {item.product?.imageUrl ? (
                                <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="size-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{item.product?.productTitle ?? "—"}</p>
                            {item.product?.variantTitle && (
                              <p className="text-xs text-muted-foreground">{item.product.variantTitle}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {item.unitPrice != null ? `$${Number(item.unitPrice).toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {item.quantity ?? 1}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {item.unitPrice != null
                              ? `$${(Number(item.unitPrice) * (item.quantity ?? 1)).toFixed(2)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Totals */}
                  <div className="px-6 py-3 border-t space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                    </div>
                    {o.discountAmount != null && o.discountAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Discount</span>
                        <span className="tabular-nums text-green-600">−${Number(o.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {o.giftCardAmount != null && o.giftCardAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gift card</span>
                        <span className="tabular-nums text-green-600">−${Number(o.giftCardAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total</span>
                      <span className="tabular-nums">
                        {o.currency ?? "$"}{Number(o.totalAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Fulfillments */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Fulfillments ({fulfillments.length})</CardTitle>
              {canFulfill && (
                <Button variant="outline" size="sm" onClick={openCreateFulfillment}>
                  <Plus className="size-3.5 mr-1.5" />Add fulfillment
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {fulfillments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fulfillments yet.</p>
              ) : (
                fulfillments.map((f) => (
                  <div key={f.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium font-mono">#{String(f.id).slice(0, 8).toUpperCase()}</p>
                        <Badge variant={fulfillmentStatusVariant(f.status ?? "")}>
                          {statusLabel(f.status ?? "")}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEditFulfillment(f)}>
                        <Pencil className="size-3.5 mr-1.5" />Edit
                      </Button>
                    </div>
                    {f.trackingNumber && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Tracking:</span>
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
                    {f.note && <p className="text-sm text-muted-foreground">{f.note}</p>}
                    {f.items && f.items.length > 0 && (
                      <p className="text-xs text-muted-foreground">{f.items.length} item{f.items.length !== 1 ? "s" : ""}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add note */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Leave a comment..."
                  className="resize-none min-h-0 py-2 text-sm"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  className="self-start"
                  onClick={() => noteText.trim() && noteMutation.mutate(noteText.trim())}
                  disabled={noteMutation.isPending || !noteText.trim()}
                >
                  Post
                </Button>
              </div>
              {/* Events */}
              <div className="space-y-3">
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground">No events yet.</p>
                )}
                {[...events].reverse().map((e) => (
                  <div key={e.id} className="flex gap-3 text-sm">
                    <div className="mt-1.5 size-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {EVENT_LABELS[e.type ?? ""] ?? e.type}
                        </span>
                        {e.authorName && (
                          <span className="text-muted-foreground text-xs">by {e.authorName}</span>
                        )}
                        <span className="text-muted-foreground text-xs ml-auto">
                          {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                      {e.message && <p className="text-muted-foreground mt-0.5">{e.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">

          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <p className="text-muted-foreground text-xs">User ID</p>
                <p className="font-mono text-xs">{o.userId ?? "—"}</p>
              </div>
              {o.userId && (
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: o.userId }}
                  className="text-xs text-primary hover:underline"
                >
                  View customer →
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Shipping</CardTitle>
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  setAdminNotesForm(o.adminNotes ?? "")
                  setEditNotes(true)
                }}
              >
                <Pencil className="size-3.5 mr-1" />Edit
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Address</p>
                <p className="whitespace-pre-line">{o.shippingAddress || "—"}</p>
              </div>
              {o.adminNotes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Admin notes</p>
                  <p className="whitespace-pre-line text-muted-foreground">{o.adminNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant(o.status ?? "")} className="text-xs">
                  {statusLabel(o.status ?? "")}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">
                  {o.currency ?? "$"}{Number(o.totalAmount ?? 0).toFixed(2)}
                </span>
              </div>
              {o.discountAmount != null && o.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600 tabular-nums">−${Number(o.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {o.giftCardAmount != null && o.giftCardAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gift card</span>
                  <span className="text-green-600 tabular-nums">−${Number(o.giftCardAmount).toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Create fulfillment */}
      <Dialog open={fulfillOpen} onOpenChange={(o) => { setFulfillOpen(o); if (!o) { setSelectedItemIds(new Set()); setItemQtys({}) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create fulfillment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Items selection */}
            {items.length > 0 && (
              <div className="space-y-2">
                <Label>Items to fulfill</Label>
                <div className="rounded-md border divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={selectedItemIds.has(item.id!)}
                        onCheckedChange={(checked) => {
                          setSelectedItemIds((prev) => {
                            const next = new Set(prev)
                            if (checked) next.add(item.id!)
                            else next.delete(item.id!)
                            return next
                          })
                          if (checked && !itemQtys[item.id!]) {
                            setItemQtys((prev) => ({ ...prev, [item.id!]: item.quantity ?? 1 }))
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.productTitle ?? "Item"}</p>
                        {item.product?.variantTitle && (
                          <p className="text-xs text-muted-foreground">{item.product.variantTitle}</p>
                        )}
                      </div>
                      {selectedItemIds.has(item.id!) && (
                        <Input
                          type="number"
                          min={1}
                          max={item.quantity ?? 1}
                          className="w-16 h-7 text-sm text-center"
                          value={itemQtys[item.id!] ?? item.quantity ?? 1}
                          onChange={(e) => setItemQtys((prev) => ({ ...prev, [item.id!]: Number(e.target.value) }))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">/{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  onChange={(e) => setFulfillForm((f) => ({ ...f, trackingCompany: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tracking URL</Label>
                <Input
                  placeholder="https://..."
                  value={fulfillForm.trackingUrl ?? ""}
                  onChange={(e) => setFulfillForm((f) => ({ ...f, trackingUrl: e.target.value }))}
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
            <Button variant="outline" onClick={() => setFulfillOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateFulfillment}
              disabled={fulfillMutation.isPending}
            >
              Create fulfillment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update fulfillment */}
      <Dialog open={!!editFulfillment} onOpenChange={(o) => !o && setEditFulfillment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update fulfillment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editFulfillForm.status ?? "PENDING"}
                onValueChange={(v) =>
                  setEditFulfillForm((f) => ({ ...f, status: v as typeof FULFILLMENT_STATUSES[number] }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tracking number</Label>
              <Input
                value={editFulfillForm.trackingNumber ?? ""}
                onChange={(e) => setEditFulfillForm((f) => ({ ...f, trackingNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Carrier</Label>
                <Input
                  value={editFulfillForm.trackingCompany ?? ""}
                  onChange={(e) => setEditFulfillForm((f) => ({ ...f, trackingCompany: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tracking URL</Label>
                <Input
                  value={editFulfillForm.trackingUrl ?? ""}
                  onChange={(e) => setEditFulfillForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                value={editFulfillForm.note ?? ""}
                onChange={(e) => setEditFulfillForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFulfillment(null)}>Cancel</Button>
            <Button
              onClick={() =>
                editFulfillment?.id &&
                updateFulfillmentMutation.mutate({ fulfillmentId: editFulfillment.id, body: editFulfillForm })
              }
              disabled={updateFulfillmentMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit admin notes + shipping */}
      <Dialog open={editNotes} onOpenChange={setEditNotes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit order details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Shipping address</Label>
              <Textarea
                rows={3}
                value={(order as Order).shippingAddress ?? ""}
                onChange={() => {
                  /* controlled via mutation only */
                }}
                placeholder="Shipping address..."
                className="resize-none"
                defaultValue={(order as Order).shippingAddress ?? ""}
                key="shipping"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Admin notes</Label>
              <Textarea
                rows={3}
                value={adminNotesForm}
                onChange={(e) => setAdminNotesForm(e.target.value)}
                placeholder="Internal notes..."
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNotes(false)}>Cancel</Button>
            <Button
              onClick={() => updateOrderMutation.mutate({ adminNotes: adminNotesForm })}
              disabled={updateOrderMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel order #{String(o.id ?? "").slice(0, 8).toUpperCase()}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelMutation.mutate()}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund confirm */}
      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue refund?</AlertDialogTitle>
            <AlertDialogDescription>
              This will issue a full refund of {o.currency ?? "$"}{Number(o.totalAmount ?? 0).toFixed(2)} for this order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => refundMutation.mutate()}>
              Issue refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
