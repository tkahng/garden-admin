import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Search, Plus, Trash2 } from "lucide-react"
import { downloadCsv } from "@/lib/download"
import { bulkCancelOrders } from "@/lib/bulk-api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type OrderStatus = components["schemas"]["OrderResponse"]["status"]
type Order = components["schemas"]["OrderResponse"]
type DraftLineItem = { variantId: string; quantity: number; unitPrice: string }

const PAGE_SIZE = 20

const STATUS_TABS: { label: string; value: OrderStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Drafts", value: "DRAFT" },
  { label: "Pending payment", value: "PENDING_PAYMENT" },
  { label: "Paid", value: "PAID" },
  { label: "Partially fulfilled", value: "PARTIALLY_FULFILLED" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "Refunded", value: "REFUNDED" },
  { label: "Cancelled", value: "CANCELLED" },
]

function statusVariant(status: string) {
  switch (status) {
    case "PAID": return "default"
    case "FULFILLED": return "default"
    case "PARTIALLY_FULFILLED": return "secondary"
    case "PENDING_PAYMENT": return "secondary"
    case "CANCELLED": return "destructive"
    case "REFUNDED": return "outline"
    default: return "outline"
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT": return "Draft"
    case "PENDING_PAYMENT": return "Pending payment"
    case "PAID": return "Paid"
    case "PARTIALLY_FULFILLED": return "Partially fulfilled"
    case "FULFILLED": return "Fulfilled"
    case "REFUNDED": return "Refunded"
    case "CANCELLED": return "Cancelled"
    default: return status
  }
}

// ─── CreateDraftDialog ────────────────────────────────────────────────────────

function CreateDraftDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (id: string) => void
}) {
  const [userId, setUserId] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [poNumber, setPoNumber] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [lines, setLines] = useState<DraftLineItem[]>([{ variantId: "", quantity: 1, unitPrice: "" }])

  function reset() {
    setUserId("")
    setGuestEmail("")
    setCurrency("USD")
    setPoNumber("")
    setCompanyId("")
    setShippingAddress("")
    setLines([{ variantId: "", quantity: 1, unitPrice: "" }])
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST("/api/v1/admin/orders/draft", {
        body: {
          userId: userId.trim() || undefined,
          guestEmail: guestEmail.trim() || undefined,
          currency: currency.trim() || "USD",
          poNumber: poNumber.trim() || undefined,
          companyId: companyId.trim() || undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          items: lines.map((l) => ({
            variantId: l.variantId.trim(),
            quantity: l.quantity,
            unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
          })),
        },
      })
      if (error) throw error
      return (data as { data?: { id?: string } } | undefined)?.data?.id
    },
    onSuccess: (newId) => {
      toast.success("Draft order created")
      reset()
      onOpenChange(false)
      if (newId) onCreated(newId)
    },
    onError: () => toast.error("Failed to create draft"),
  })

  function handleSubmit() {
    if (lines.length === 0 || lines.some((l) => !l.variantId.trim())) {
      toast.error("All items need a variant ID")
      return
    }
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New draft order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>User ID (optional)</Label>
              <Input
                placeholder="UUID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Guest email (optional)</Label>
              <Input
                type="email"
                placeholder="guest@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>PO number</Label>
              <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Company ID (optional)</Label>
            <Input
              placeholder="UUID"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Shipping address</Label>
            <Input
              placeholder="123 Main St, City, State"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setLines((prev) => [...prev, { variantId: "", quantity: 1, unitPrice: "" }])}
              >
                <Plus className="size-3 mr-1" />Add row
              </Button>
            </div>
            <div className="rounded-md border divide-y">
              <div className="grid grid-cols-[1fr_70px_90px_32px] gap-2 px-3 py-1.5 text-xs text-muted-foreground font-medium">
                <span>Variant ID</span><span>Qty</span><span>Unit price</span><span />
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_90px_32px] gap-2 px-3 py-2 items-center">
                  <Input
                    placeholder="UUID"
                    value={line.variantId}
                    onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, variantId: e.target.value } : l))}
                    className="h-7 text-xs font-mono"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l))}
                    className="h-7 text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="auto"
                    value={line.unitPrice}
                    onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, unitPrice: e.target.value } : l))}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive shrink-0"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OrdersPage() {
  const { page: rawPage, status, userId, from, to } = useSearch({ from: "/_authenticated/orders" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draftDialogOpen, setDraftDialogOpen] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      if (userId) params.set("userId", userId)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const qs = params.toString()
      await downloadCsv(`/api/v1/admin/orders/export${qs ? `?${qs}` : ""}`, "orders.csv")
    } finally {
      setExporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", page, status, userId, from, to],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders", {
        params: { query: { page, size: PAGE_SIZE, status: status as OrderStatus, userId, from, to } },
      })
      if (error) throw error
      return data
    },
  })

  const orders = (data?.data?.content ?? []) as Order[]
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
    setSelectedIds(new Set())
  }

  const bulkCancelMutation = useMutation({
    mutationFn: () => bulkCancelOrders([...selectedIds]),
    onSuccess: invalidate,
  })

  const cancellableSelected = orders.filter(
    (o) => selectedIds.has(String(o.id)) &&
      (o.status === "PENDING_PAYMENT" || o.status === "PAID")
  )

  function toggleAll() {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map((o) => String(o.id))))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function setPage(newPage: number) {
    setSelectedIds(new Set())
    void navigate({ to: "/orders", search: { page: newPage, status, userId, from, to }, replace: true })
  }

  function setStatus(newStatus: string | undefined) {
    setSelectedIds(new Set())
    void navigate({ to: "/orders", search: { page: 0, status: newStatus, userId, from, to }, replace: true })
  }

  function setFilter(patch: { userId?: string; from?: string; to?: string }) {
    setSelectedIds(new Set())
    void navigate({
      to: "/orders",
      search: { page: 0, status, userId: patch.userId ?? userId, from: patch.from ?? from, to: patch.to ?? to },
      replace: true,
    })
  }

  const allChecked = orders.length > 0 && selectedIds.size === orders.length
  const someChecked = selectedIds.size > 0 && selectedIds.size < orders.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setDraftDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            New draft order
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 size-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0",
              (status ?? undefined) === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Secondary filters: customer ID + date range */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Customer ID..."
            className="pl-9 w-56"
            value={userId ?? ""}
            onChange={(e) => setFilter({ userId: e.target.value || undefined })}
          />
        </div>
        <Input
          type="date"
          className="w-40"
          value={from ? from.slice(0, 10) : ""}
          onChange={(e) => setFilter({ from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })}
          title="From date"
        />
        <Input
          type="date"
          className="w-40"
          value={to ? to.slice(0, 10) : ""}
          onChange={(e) => setFilter({ to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined })}
          title="To date"
        />
        {(userId || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate({ to: "/orders", search: { page: 0, status }, replace: true })}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulkCancelMutation.isPending || cancellableSelected.length === 0}
            onClick={() => {
              if (confirm(`Cancel ${cancellableSelected.length} order(s)?`)) {
                bulkCancelMutation.mutate()
              }
            }}
          >
            Cancel orders
          </Button>
          {cancellableSelected.length < selectedIds.size && (
            <span className="text-xs text-muted-foreground">
              {selectedIds.size - cancellableSelected.length} selected order(s) cannot be cancelled
            </span>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked ? "indeterminate" : allChecked ? "checked" : "unchecked"}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">No orders found</TableCell>
              </TableRow>
            )}
            {orders.map((order) => {
              const id = String(order.id)
              const checked = selectedIds.has(id)
              const isPaid = order.status === "PAID" || order.status === "PARTIALLY_FULFILLED" || order.status === "FULFILLED"
              const isFulfilled = order.status === "FULFILLED"
              const isPartial = order.status === "PARTIALLY_FULFILLED"
              return (
                <TableRow key={id} data-state={checked ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOne(id)}
                      aria-label={`Select order ${id.slice(0, 8).toUpperCase()}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link to="/orders/$orderId" params={{ orderId: id }} className="font-medium hover:underline font-mono text-sm">
                      #{id.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {String(order.userId ?? "—").slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {order.status === "CANCELLED" || order.status === "REFUNDED" ? (
                      <Badge variant={statusVariant(order.status ?? "")}>
                        {statusLabel(order.status ?? "")}
                      </Badge>
                    ) : (
                      <Badge variant={isPaid ? "default" : "secondary"}>
                        {isPaid ? "Paid" : "Pending"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.status !== "CANCELLED" && order.status !== "REFUNDED" && order.status !== "PENDING_PAYMENT" && (
                      <Badge variant={isFulfilled ? "default" : isPartial ? "secondary" : "outline"}>
                        {isFulfilled ? "Fulfilled" : isPartial ? "Partial" : "Unfulfilled"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {order.totalAmount != null
                      ? `${order.currency ?? "$"}${Number(order.totalAmount).toFixed(2)}`
                      : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="order" onPageChange={setPage} />
        )}
      </div>

      <CreateDraftDialog
        open={draftDialogOpen}
        onOpenChange={setDraftDialogOpen}
        onCreated={(newId) => {
          void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
          void navigate({ to: "/orders/$orderId", params: { orderId: newId } })
        }}
      />
    </div>
  )
}
