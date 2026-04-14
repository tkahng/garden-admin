import { useEffect, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
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

const PAGE_SIZE = 20

export function ProductsPage() {
  const { page: rawPage, titleContains } = useSearch({ from: "/_authenticated/products" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState(titleContains ?? "")

  useEffect(() => { setSearchInput(titleContains ?? "") }, [titleContains])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", page, titleContains],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/products", {
        params: { query: { page, size: PAGE_SIZE, titleContains: titleContains || undefined } },
      })
      if (error) throw error
      return data
    },
  })

  const products = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/products", search: { page: newPage, titleContains }, replace: true })
  }

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
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              void navigate({
                to: "/products",
                search: { page: 0, titleContains: e.target.value || undefined },
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
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  No products yet.{" "}
                  <Link to={"/products/new" as string} className="underline">Add your first product</Link>
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow key={String(p.id)}>
                <TableCell>
                  <Link to={`/products/${p.id}` as string} className="font-medium hover:underline">
                    {String(p.title ?? (p as Record<string, unknown>).name ?? "Untitled")}
                  </Link>
                  {p.handle != null && (
                    <p className="text-xs text-muted-foreground">{String(p.handle)}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={String(p.status) === "ACTIVE" ? "default" : "secondary"}>
                    {String(p.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {Array.isArray(p.variants) ? p.variants.length : "—"}
                </TableCell>
                <TableCell>
                  {(p as Record<string, unknown>).price != null
                    ? `$${Number((p as Record<string, unknown>).price).toFixed(2)}`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} product{total !== 1 ? "s" : ""}</span>
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
