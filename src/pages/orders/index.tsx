import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Download } from "lucide-react"
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"

type OrderStatus = components["schemas"]["OrderResponse"]["status"]
type Order = components["schemas"]["OrderResponse"]

const PAGE_SIZE = 20

const STATUS_TABS: { label: string; value: OrderStatus | undefined }[] = [
  { label: "All", value: undefined },
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
    case "PENDING_PAYMENT": return "Pending payment"
    case "PAID": return "Paid"
    case "PARTIALLY_FULFILLED": return "Partially fulfilled"
    case "FULFILLED": return "Fulfilled"
    case "REFUNDED": return "Refunded"
    case "CANCELLED": return "Cancelled"
    default: return status
  }
}

export function OrdersPage() {
  const { page: rawPage, status } = useSearch({ from: "/_authenticated/orders" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      const qs = params.toString()
      await downloadCsv(`/api/v1/admin/orders/export${qs ? `?${qs}` : ""}`, "orders.csv")
    } finally {
      setExporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", page, status],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/orders", {
        params: { query: { page, size: PAGE_SIZE, status: status as OrderStatus } },
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
    void navigate({ to: "/orders", search: { page: newPage, status }, replace: true })
  }

  function setStatus(newStatus: string | undefined) {
    setSelectedIds(new Set())
    void navigate({ to: "/orders", search: { page: 0, status: newStatus }, replace: true })
  }

  const allChecked = orders.length > 0 && selectedIds.size === orders.length
  const someChecked = selectedIds.size > 0 && selectedIds.size < orders.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 size-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
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
    </div>
  )
}
