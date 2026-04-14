import { Link } from "react-router"
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

export function QuotesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quotes"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/quotes", {})
      if (error) throw error
      return data
    },
  })

  const quotes = (data as { content?: Record<string, unknown>[] } | undefined)?.content ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotes</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search quotes..." className="pl-9" />
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
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No quotes found
                </TableCell>
              </TableRow>
            )}
            {quotes.map((q: Record<string, unknown>) => (
              <TableRow key={String(q.id)}>
                <TableCell>
                  <Link to={`/quotes/${q.id}`} className="font-medium hover:underline">
                    #{String(q.id).slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{String(q.status ?? "—")}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {String(q.customerEmail ?? q.userId ?? "—")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {String(q.assignedTo ?? "Unassigned")}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {q.createdAt ? new Date(q.createdAt as string).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
