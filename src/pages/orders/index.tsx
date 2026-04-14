import { useEffect, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { DataPagination } from "@/components/ui/data-pagination"

type OrderStatus = components["schemas"]["OrderResponse"]["status"]

const PAGE_SIZE = 20

function statusVariant(status: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "paid":
      return "default"
    case "pending":
      return "secondary"
    case "cancelled":
      return "destructive"
    default:
      return "outline"
  }
}

export function OrdersPage() {
  const { page: rawPage, status } = useSearch({ from: "/_authenticated/orders" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [statusInput, setStatusInput] = useState(status ?? "")

  useEffect(() => { setStatusInput(status ?? "") }, [status])

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

  const orders = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/orders", search: { page: newPage, status }, replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by status..."
            className="pl-9"
            value={statusInput}
            onChange={(e) => {
              setStatusInput(e.target.value)
              void navigate({
                to: "/orders",
                search: { page: 0, status: e.target.value || undefined },
                replace: true,
              })
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No orders found</TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={String(order.id)}>
                <TableCell>
                  <Link to="/orders/$orderId" params={{ orderId: String(order.id) }} className="font-medium hover:underline">
                    #{String(order.id).slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {order.createdAt ? new Date(order.createdAt as string).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  {String((order as Record<string, unknown>).customerEmail ?? order.userId ?? "—")}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(String(order.status ?? ""))}>
                    {String(order.status ?? "—")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.totalAmount != null ? `$${Number(order.totalAmount).toFixed(2)}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="order" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
