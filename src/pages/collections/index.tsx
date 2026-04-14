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

export function CollectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/admin/collections",
        {}
      )
      if (error) throw error
      return data
    },
  })

  const collections = data?.data?.content ?? []

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
                <TableCell
                  colSpan={3}
                  className="py-12 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && collections.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-12 text-center text-muted-foreground"
                >
                  No collections yet.
                </TableCell>
              </TableRow>
            )}
            {collections.map((c: Record<string, unknown>) => (
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
                  <Badge
                    variant={
                      String(c.status) === "ACTIVE" ? "default" : "secondary"
                    }
                  >
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
      </div>
    </div>
  )
}
