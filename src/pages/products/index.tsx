import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
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
import { Plus, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export function ProductsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/products", {})
      if (error) throw error
      return data
    },
  })

  const products = data?.data?.content ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild size="sm">
          <Link to={"/products/new" as string}>
            <Plus className="mr-2 size-4" />
            Add product
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && products.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-muted-foreground"
                >
                  No products yet.{" "}
                  <Link to={"/products/new" as string} className="underline">
                    Add your first product
                  </Link>
                </TableCell>
              </TableRow>
            )}
            {products.map((p: Record<string, unknown>) => (
              <TableRow key={String(p.id)}>
                <TableCell>
                  <Link
                    to={`/products/${p.id}` as string}
                    className="font-medium hover:underline"
                  >
                    {String(p.title ?? p.name ?? "Untitled")}
                  </Link>
                  {p.handle != null && (
                    <p className="text-xs text-muted-foreground">
                      {String(p.handle)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      String(p.status) === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {String(p.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {Array.isArray(p.variants) ? p.variants.length : "—"}
                </TableCell>
                <TableCell>
                  {p.price != null ? `$${Number(p.price).toFixed(2)}` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
