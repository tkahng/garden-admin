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

export function CollectionsPage() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "collections", page],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/collections", {
        params: { query: { page, size: PAGE_SIZE } },
      })
      if (error) throw error
      return data
    },
  })

  const collections = data?.data?.content ?? []
  const meta = data?.data?.meta
  const total = meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <Button asChild size="sm">
          <Link to={"/collections/new" as string}>
            <Plus className="mr-2 size-4" />
            Create collection
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && collections.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                  No collections yet.
                </TableCell>
              </TableRow>
            )}
            {collections.map((c) => (
              <TableRow key={String(c.id)}>
                <TableCell>
                  <Link
                    to={`/collections/${c.id}` as string}
                    className="font-medium hover:underline"
                  >
                    {String(c.title ?? "Untitled")}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={String(c.status) === "ACTIVE" ? "default" : "secondary"}>
                    {String(c.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.productCount != null ? String(c.productCount) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} collection{total !== 1 ? "s" : ""}</span>
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
