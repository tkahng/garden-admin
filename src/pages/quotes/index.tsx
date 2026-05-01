import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"

type QuoteStatus = components["schemas"]["QuoteRequestResponse"]["status"]

const STATUS_TABS: { label: string; value: QuoteStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: "PENDING" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Pending approval", value: "PENDING_APPROVAL" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Paid", value: "PAID" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Cancelled", value: "CANCELLED" },
]

const PAGE_SIZE = 20

export function QuotesPage() {
  const { page: rawPage, status } = useSearch({ from: "/_authenticated/quotes" })
  const page = rawPage ?? 0
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quotes", page, status],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/quotes", {
        params: { query: { page, size: PAGE_SIZE, status: status as QuoteStatus } },
      })
      if (error) throw error
      return data
    },
  })

  const quotes = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/quotes", search: { page: newPage, status }, replace: true })
  }

  function setStatus(newStatus: QuoteStatus | undefined) {
    void navigate({ to: "/quotes", search: { page: 0, status: newStatus }, replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotes</h1>
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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No quotes found</TableCell>
              </TableRow>
            )}
            {quotes.map((q) => (
              <TableRow key={String(q.id)}>
                <TableCell>
                  <Link to={`/quotes/${q.id}` as string} className="font-medium hover:underline">
                    #{String(q.id).slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{String(q.status ?? "—")}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {String((q as Record<string, unknown>).customerEmail ?? q.userId ?? "—")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {String((q as Record<string, unknown>).assignedTo ?? "Unassigned")}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {q.createdAt ? new Date(q.createdAt as string).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="quote" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
