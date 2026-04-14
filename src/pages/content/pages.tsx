import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

const PAGE_SIZE = 20

export function PagesPage() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pages", page],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/pages", {
        params: { query: { page, pageSize: PAGE_SIZE } },
      })
      if (error) throw error
      return data
    },
  })

  const pages = data?.data?.content ?? []
  const meta = data?.data?.meta
  const total = meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <Button asChild size="sm">
          <Link to={"/pages/new" as string}>
            <Plus className="size-4 mr-2" />
            Add page
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                  No pages yet.
                </TableCell>
              </TableRow>
            )}
            {pages.map((p) => (
              <TableRow key={String(p.id)}>
                <TableCell>
                  <Link to={`/pages/${p.id}` as string} className="font-medium hover:underline">
                    {String(p.title ?? "Untitled")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {String(p.handle ?? "—")}
                </TableCell>
                <TableCell>
                  <Badge variant={String(p.status) === "PUBLISHED" ? "default" : "secondary"}>
                    {String(p.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} page{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
