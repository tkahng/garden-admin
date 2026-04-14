import { useEffect, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type QuoteStatus = components["schemas"]["QuoteRequestResponse"]["status"]

const PAGE_SIZE = 20

export function QuotesPage() {
  const { page: rawPage, status } = useSearch({ from: "/_authenticated/quotes" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [statusInput, setStatusInput] = useState(status ?? "")

  useEffect(() => { setStatusInput(status ?? "") }, [status])

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotes</h1>
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
                to: "/quotes",
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
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} quote{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>Previous</Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
