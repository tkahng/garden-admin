import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { apiClient, getAuthToken } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CountrySelect } from "@/components/CountrySelect"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
import { ArrowLeft, Ban, ImageIcon, Pencil, RefreshCcw, RefreshCw, Plus, Package, FileText, CheckCheck, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"


type Order = components["schemas"]["OrderResponse"]
type OrderItem = components["schemas"]["OrderItemResponse"]
type Fulfillment = components["schemas"]["FulfillmentResponse"]
type OrderEvent = components["schemas"]["OrderEventResponse"]
type CreateFulfillment = components["schemas"]["CreateFulfillmentRequest"]
type UpdateFulfillment = components["schemas"]["UpdateFulfillmentRequest"]
type DraftItem = { variantId: string; quantity: number; unitPrice: string }
type Invoice = components["schemas"]["InvoiceResponse"]

const shippingAddressFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(64),
  lastName: z.string().trim().min(1, "Last name is required").max(64),
  company: z.string().trim().max(128).optional().default(""),
  address1: z.string().trim().min(1, "Address line 1 is required").max(255),
  address2: z.string().trim().max(255).optional().default(""),
  city: z.string().trim().min(1, "City is required").max(128),
  province: z.string().trim().max(128).optional().default(""),
  zip: z.string().trim().min(1, "ZIP is required").max(20),
  country: z.string().trim().regex(/^[A-Z]{2}$/, "Country is required"),
})

type ShippingAddressFormInput = z.input<typeof shippingAddressFormSchema>
type ShippingAddressForm = z.output<typeof shippingAddressFormSchema>

const storedShippingAddressSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  address1: z.string().nullable().optional(),
  address2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
}).passthrough()

const EMPTY_SHIPPING_ADDRESS: ShippingAddressFormInput = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  zip: "",
  country: "US",
}

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

const ACTIVE_FULFILLMENT_STATUSES = new Set<string>(["PENDING", "SHIPPED", "DELIVERED"])

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

function paymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING_PAYMENT": return "Payment pending"
    case "PAID": case "PARTIALLY_FULFILLED": case "FULFILLED": return "Paid"
    case "INVOICED": return "Invoiced"
    case "REFUNDED": return "Refunded"
    case "CANCELLED": return "Cancelled"
    default: return statusLabel(status)
  }
}

function parseShippingAddress(value?: string | null): ShippingAddressFormInput {
  if (!value?.trim()) return { ...EMPTY_SHIPPING_ADDRESS }

  try {
    const parsed = storedShippingAddressSchema.safeParse(JSON.parse(value))
    if (parsed.success) {
      const address = parsed.data
      return {
        firstName: address.firstName ?? "",
        lastName: address.lastName ?? "",
        company: address.company ?? "",
        address1: address.address1 ?? "",
        address2: address.address2 ?? "",
        city: address.city ?? "",
        province: address.province ?? "",
        zip: address.zip ?? "",
        country: address.country ?? "US",
      }
    }
  } catch {
    // Legacy orders may have a plain multi-line address string.
  }

  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  return {
    ...EMPTY_SHIPPING_ADDRESS,
    firstName: lines[0]?.split(" ").slice(0, -1).join(" ") ?? "",
    lastName: lines[0]?.split(" ").slice(-1).join(" ") ?? "",
    address1: lines[1] ?? value,
    city: lines[2] ?? "",
    country: lines[3] ?? "US",
  }
}

function shippingAddressLines(value?: string | null) {
  const address = parseShippingAddress(value)
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.company,
    address.address1,
    address.address2,
    [address.city, address.province, address.zip].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => typeof line === "string" && line.trim().length > 0)
}

function serializeShippingAddress(address: ShippingAddressForm) {
  const parsed = shippingAddressFormSchema.parse(address)
  const clean = Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, value.trim() || null])
  )
  return JSON.stringify(clean)
}

function deriveFulfillmentProgress(items: OrderItem[], fulfillments: Fulfillment[]) {
  const fulfilledByItemId = new Map<string, number>()

  for (const fulfillment of fulfillments) {
    if (!ACTIVE_FULFILLMENT_STATUSES.has(fulfillment.status ?? "")) continue
    for (const item of fulfillment.items ?? []) {
      if (!item.orderItemId) continue
      fulfilledByItemId.set(
        item.orderItemId,
        (fulfilledByItemId.get(item.orderItemId) ?? 0) + (item.quantity ?? 0)
      )
    }
  }

  const rows = items.map((item) => {
    const ordered = item.quantity ?? 0
    const fulfilled = Math.min(ordered, item.id ? fulfilledByItemId.get(item.id) ?? 0 : 0)
    return {
      item,
      ordered,
      fulfilled,
      remaining: Math.max(ordered - fulfilled, 0),
    }
  })

  const totalOrdered = rows.reduce((sum, row) => sum + row.ordered, 0)
  const totalFulfilled = rows.reduce((sum, row) => sum + row.fulfilled, 0)
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0)

  let label = "Unfulfilled"
  if (totalOrdered > 0 && totalRemaining === 0) label = "Fulfilled"
  else if (totalFulfilled > 0) label = "Partially fulfilled"

  return { rows, totalOrdered, totalFulfilled, totalRemaining, label }
}

function deriveShipmentStatus(fulfillments: Fulfillment[]) {
  if (fulfillments.some((f) => f.status === "SHIPPED")) return "Shipped"
  if (fulfillments.some((f) => f.status === "PENDING")) return "Pending"
  if (fulfillments.some((f) => f.status === "DELIVERED")) return "Delivered"
  if (fulfillments.some((f) => f.status === "CANCELLED")) return "Cancelled"
  return "Not shipped"
}

function nextFulfillmentActions(status?: Fulfillment["status"]) {
  switch (status) {
    case "PENDING": return ["SHIPPED", "CANCELLED"] as const
    case "SHIPPED": return ["DELIVERED", "CANCELLED"] as const
    default: return [] as const
  }
}

function canCreateFulfillment(status?: Order["status"]) {
  return status !== "DRAFT"
    && status !== "PENDING_PAYMENT"
    && status !== "CANCELLED"
    && status !== "REFUNDED"
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

  // Fulfillment status confirmation
  const [confirmFulfillment, setConfirmFulfillment] = useState<{ fulfillmentId: string; status: string } | null>(null)

  // Admin notes / cancel / refund confirms
  const [editNotes, setEditNotes] = useState(false)
  const [adminNotesForm, setAdminNotesForm] = useState("")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [syncPaymentOpen, setSyncPaymentOpen] = useState(false)
  const [noteText, setNoteText] = useState("")
  const shippingAddressForm = useForm<ShippingAddressFormInput, unknown, ShippingAddressForm>({
    resolver: zodResolver(shippingAddressFormSchema),
    defaultValues: EMPTY_SHIPPING_ADDRESS,
  })

  // Create invoice
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [invoiceCompanyId, setInvoiceCompanyId] = useState("")
  const [invoiceTerms, setInvoiceTerms] = useState(30)

  // Draft items editing
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [draftItemsInit, setDraftItemsInit] = useState(false)

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

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/companies")
      if (error) throw error
      return data
    },
    enabled: invoiceOpen,
  })

  const { data: linkedInvoice } = useQuery<Invoice | null>({
    queryKey: ["admin", "orders", id, "invoice"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/invoices", {
        params: { query: { orderId: id, size: 1 } },
      })
      if (error) return null
      const items = (data as { data?: { content?: Invoice[] } } | undefined)?.data?.content ?? []
      return items[0] ?? null
    },
    enabled: !!id,
  })
  const companies = (companiesData as { content?: { id: string; name: string }[] } | undefined)?.content ?? []

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

  const syncPaymentMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080"
      const token = getAuthToken()
      const res = await fetch(`${baseUrl}/api/v1/admin/orders/${id}/sync-payment`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
      if (!res.ok) throw await res.json()
    },
    onSuccess: () => {
      toast.success("Payment status synced")
      invalidate()
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
      setSyncPaymentOpen(false)
    },
    onError: () => toast.error("Failed to sync payment status"),
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

  function openEditOrderDetails() {
    if (!order) return
    setAdminNotesForm(order.adminNotes ?? "")
    shippingAddressForm.reset(parseShippingAddress(order.shippingAddress))
    setEditNotes(true)
  }

  function handleSaveOrderDetails(address: ShippingAddressForm) {
    updateOrderMutation.mutate({
      adminNotes: adminNotesForm,
      shippingAddress: serializeShippingAddress(address),
    })
  }

  const fulfillMutation = useMutation({
    mutationFn: async (body: CreateFulfillment) => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{orderId}/fulfillments", {
        params: { path: { orderId: id } },
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
      invalidate()
      setEditFulfillment(null)
    },
    onError: () => toast.error("Failed to update fulfillment"),
  })

  const noteMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{orderId}/events", {
        params: { path: { orderId: id } },
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

  const createInvoiceMutation = useMutation({
    mutationFn: async ({ companyId, paymentTermsDays }: { companyId: string; paymentTermsDays: number }) => {
      const { error } = await apiClient.POST("/api/v1/admin/invoices/from-order/{orderId}", {
        params: { path: { orderId: id } },
        body: { companyId, paymentTermsDays },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Invoice created")
      invalidate()
      setInvoiceOpen(false)
      setInvoiceCompanyId("")
      setInvoiceTerms(30)
    },
    onError: () => toast.error("Failed to create invoice"),
  })

  const updateDraftItemsMutation = useMutation({
    mutationFn: async (items: DraftItem[]) => {
      const { error } = await apiClient.PUT("/api/v1/admin/orders/{id}/draft/items", {
        params: { path: { id } },
        body: items.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitPrice: it.unitPrice ? Number(it.unitPrice) : undefined,
        })),
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Draft items saved")
      invalidate()
    },
    onError: () => toast.error("Failed to save draft items"),
  })

  const completeDraftMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/orders/{id}/draft/complete", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Draft completed")
      invalidate()
      void qc.invalidateQueries({ queryKey: ["admin", "orders", id, "events"] })
    },
    onError: () => toast.error("Failed to complete draft"),
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
  const fulfillmentProgress = deriveFulfillmentProgress(items, fulfillments)
  const fulfillableRows = fulfillmentProgress.rows.filter((row) => row.item.id && row.remaining > 0)
  const shipmentStatus = deriveShipmentStatus(fulfillments)
  const shippingAddress = shippingAddressLines(o.shippingAddress)
  const isDraft = o.status === "DRAFT"
  const canCancel = o.status !== "CANCELLED" && o.status !== "REFUNDED"
  const canRefund = o.status === "PAID" || o.status === "PARTIALLY_FULFILLED" || o.status === "FULFILLED"
  const canFulfill = canCreateFulfillment(o.status) && fulfillmentProgress.totalRemaining > 0
  const canInvoice = o.status !== "CANCELLED" && o.status !== "REFUNDED" && !isDraft
  const canSyncPayment = o.status === "PENDING_PAYMENT" && !!o.stripeSessionId

  // Initialise editable draft items once the order loads
  if (isDraft && !draftItemsInit) {
    setDraftItems(
      items.map((it) => ({
        variantId: it.variantId ?? "",
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice != null ? String(it.unitPrice) : "",
      }))
    )
    setDraftItemsInit(true)
  }

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
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant(o.status ?? "")}>{paymentStatusLabel(o.status ?? "")}</Badge>
          <Badge variant={fulfillmentProgress.totalRemaining === 0 && fulfillmentProgress.totalOrdered > 0 ? "default" : fulfillmentProgress.totalFulfilled > 0 ? "secondary" : "outline"}>
            {fulfillmentProgress.label}
          </Badge>
          <Badge variant={shipmentStatus === "Delivered" ? "default" : shipmentStatus === "Shipped" ? "secondary" : shipmentStatus === "Cancelled" ? "destructive" : "outline"}>
            {shipmentStatus}
          </Badge>
        </div>
        <div className="flex gap-2 shrink-0">
          {isDraft && (
            <Button
              size="sm"
              onClick={() => completeDraftMutation.mutate()}
              disabled={completeDraftMutation.isPending || items.length === 0}
            >
              <CheckCheck className="size-4 mr-2" />
              Complete order
            </Button>
          )}
          {canFulfill && (
            <Button size="sm" onClick={openCreateFulfillment}>
              <Package className="size-4 mr-2" />
              Fulfill items
            </Button>
          )}
          {canInvoice && (
            <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(true)}>
              <FileText className="size-4 mr-2" />
              Create invoice
            </Button>
          )}
          {canSyncPayment && (
            <Button variant="outline" size="sm" onClick={() => setSyncPaymentOpen(true)} disabled={syncPaymentMutation.isPending}>
              <RefreshCw className="size-4 mr-2" />
              Sync payment
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

          {/* Order items — editable when DRAFT, read-only otherwise */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Items ({isDraft ? draftItems.length : items.length})</CardTitle>
              {isDraft && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraftItems((prev) => [...prev, { variantId: "", quantity: 1, unitPrice: "" }])}
                >
                  <Plus className="size-3.5 mr-1.5" />Add item
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isDraft ? (
                <div className="space-y-0">
                  {draftItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-6 pb-6">No items. Add at least one item.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant ID</TableHead>
                          <TableHead className="w-24">Qty</TableHead>
                          <TableHead className="w-32">Unit price</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input
                                placeholder="Variant UUID"
                                value={item.variantId}
                                onChange={(e) =>
                                  setDraftItems((prev) =>
                                    prev.map((it, i) => i === idx ? { ...it, variantId: e.target.value } : it)
                                  )
                                }
                                className="h-8 text-xs font-mono"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  setDraftItems((prev) =>
                                    prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value)) } : it)
                                  )
                                }
                                className="h-8 text-sm w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="auto"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  setDraftItems((prev) =>
                                    prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it)
                                  )
                                }
                                className="h-8 text-sm w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="px-6 py-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      disabled={updateDraftItemsMutation.isPending || draftItems.some((it) => !it.variantId.trim())}
                      onClick={() => updateDraftItemsMutation.mutate(draftItems)}
                    >
                      {updateDraftItemsMutation.isPending ? "Saving…" : "Save items"}
                    </Button>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 pb-6">No items.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Ordered</TableHead>
                        <TableHead className="text-right">Fulfilled</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fulfillmentProgress.rows.map(({ item, ordered, fulfilled, remaining }) => (
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
                            {ordered}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {fulfilled}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {remaining}
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
                      <div className="flex items-center gap-2">
                        {nextFulfillmentActions(f.status).map((status) => (
                          <Button
                            key={status}
                            variant={status === "CANCELLED" ? "outline" : "default"}
                            size="sm"
                            onClick={() => f.id && setConfirmFulfillment({ fulfillmentId: f.id, status })}
                            disabled={updateFulfillmentMutation.isPending}
                          >
                            {status === "SHIPPED" ? "Mark shipped" : status === "DELIVERED" ? "Mark delivered" : "Cancel fulfillment"}
                          </Button>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => openEditFulfillment(f)}>
                          <Pencil className="size-3.5 mr-1.5" />Edit tracking
                        </Button>
                      </div>
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
                onClick={openEditOrderDetails}
              >
                <Pencil className="size-3.5 mr-1" />Edit
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Address</p>
                {shippingAddress.length > 0 ? (
                  <div className="space-y-0.5">
                    {shippingAddress.map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p>—</p>
                )}
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
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant={statusVariant(o.status ?? "")} className="text-xs">
                  {paymentStatusLabel(o.status ?? "")}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment</span>
                <Badge variant={fulfillmentProgress.totalRemaining === 0 && fulfillmentProgress.totalOrdered > 0 ? "default" : fulfillmentProgress.totalFulfilled > 0 ? "secondary" : "outline"} className="text-xs">
                  {fulfillmentProgress.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipment</span>
                <Badge variant={shipmentStatus === "Delivered" ? "default" : shipmentStatus === "Shipped" ? "secondary" : shipmentStatus === "Cancelled" ? "destructive" : "outline"} className="text-xs">
                  {shipmentStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">
                  {o.currency ?? "$"}{Number(o.totalAmount ?? 0).toFixed(2)}
                </span>
              </div>
              {o.poNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PO number</span>
                  <span className="font-mono text-xs">{o.poNumber}</span>
                </div>
              )}
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
              {o.status === "INVOICED" && linkedInvoice && (
                <div className="pt-1 border-t">
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: linkedInvoice.id! }}
                    className="text-primary text-xs hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View invoice →
                  </Link>
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
            {fulfillableRows.length > 0 ? (
              <div className="space-y-2">
                <Label>Items to fulfill</Label>
                <div className="rounded-md border divide-y">
                  {fulfillableRows.map(({ item, remaining }) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        aria-label={`Select ${item.product?.productTitle ?? "item"}`}
                        checked={selectedItemIds.has(item.id!)}
                        onCheckedChange={(checked) => {
                          setSelectedItemIds((prev) => {
                            const next = new Set(prev)
                            if (checked) next.add(item.id!)
                            else next.delete(item.id!)
                            return next
                          })
                          if (checked && !itemQtys[item.id!]) {
                            setItemQtys((prev) => ({ ...prev, [item.id!]: remaining }))
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
                          max={remaining}
                          className="w-16 h-7 text-sm text-center"
                          value={itemQtys[item.id!] ?? remaining}
                          onChange={(e) => {
                            const raw = Number(e.target.value)
                            const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 1, 1), remaining)
                            setItemQtys((prev) => ({ ...prev, [item.id!]: next }))
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">/{remaining} remaining</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All items are already fulfilled.</p>
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
              disabled={fulfillMutation.isPending || selectedItemIds.size === 0}
            >
              Create fulfillment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update fulfillment */}
      <AlertDialog open={!!confirmFulfillment} onOpenChange={(o) => !o && setConfirmFulfillment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update fulfillment status?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFulfillment?.status === "CANCELLED"
                ? "This will cancel the fulfillment. This cannot be undone."
                : `Mark this fulfillment as ${confirmFulfillment?.status === "SHIPPED" ? "shipped" : "delivered"}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmFulfillment(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmFulfillment) {
                  updateFulfillmentMutation.mutate(
                    { fulfillmentId: confirmFulfillment.fulfillmentId, body: { status: confirmFulfillment.status } },
                    { onSettled: () => setConfirmFulfillment(null) }
                  )
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editFulfillment} onOpenChange={(o) => !o && setEditFulfillment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit order details</DialogTitle></DialogHeader>
          <form onSubmit={shippingAddressForm.handleSubmit(handleSaveOrderDetails)}>
              <div className="space-y-4 py-2">
                <div className="space-y-3">
                  <Label>Shipping address</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Controller
                      control={shippingAddressForm.control}
                      name="firstName"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">First name</FieldLabel>
                          <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={shippingAddressForm.control}
                      name="lastName"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">Last name</FieldLabel>
                          <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                  <Controller
                    control={shippingAddressForm.control}
                    name="company"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">Company</FieldLabel>
                        <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={shippingAddressForm.control}
                    name="address1"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">Address line 1</FieldLabel>
                        <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={shippingAddressForm.control}
                    name="address2"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">Address line 2</FieldLabel>
                        <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Controller
                      control={shippingAddressForm.control}
                      name="city"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">City</FieldLabel>
                          <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={shippingAddressForm.control}
                      name="province"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">State</FieldLabel>
                          <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={shippingAddressForm.control}
                      name="zip"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">ZIP</FieldLabel>
                          <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                  <Controller
                    control={shippingAddressForm.control}
                    name="country"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs text-muted-foreground">Country</FieldLabel>
                        <CountrySelect
                          id={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
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
                <Button type="button" variant="outline" onClick={() => setEditNotes(false)}>Cancel</Button>
                <Button type="submit" disabled={updateOrderMutation.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
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

      {/* Sync payment confirm */}
      <AlertDialog open={syncPaymentOpen} onOpenChange={setSyncPaymentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync payment status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will query Stripe for the current session status and update the order accordingly. The order may be marked as paid or cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => syncPaymentMutation.mutate()}>
              Sync payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create invoice */}
      <Dialog open={invoiceOpen} onOpenChange={(v) => { setInvoiceOpen(v); if (!v) { setInvoiceCompanyId(""); setInvoiceTerms(30) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={invoiceCompanyId} onValueChange={setInvoiceCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment terms (days)</Label>
              <Input
                type="number"
                min={0}
                value={invoiceTerms}
                onChange={(e) => setInvoiceTerms(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!invoiceCompanyId) { toast.error("Select a company"); return }
                createInvoiceMutation.mutate({ companyId: invoiceCompanyId, paymentTermsDays: invoiceTerms })
              }}
              disabled={createInvoiceMutation.isPending}
            >
              Create invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
