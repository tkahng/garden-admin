import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ImageIcon, Plus, Search, Trash2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import { DataPagination } from "@/components/ui/data-pagination"
import type { components } from "@/schema"
import { cn } from "@/lib/utils"
import { bulkChangeProductStatus, bulkDeleteProducts } from "@/lib/bulk-api"

type Product = components["schemas"]["AdminProductResponse"]

const PAGE_SIZE = 20

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Archived", value: "ARCHIVED" },
] as const

function priceRange(p: Product): string {
  const prices = (p.variants ?? []).map((v) => v.price).filter((x): x is number => x != null)
  if (prices.length === 0) return "—"
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `$${min.toFixed(2)}`
  return `$${min.toFixed(2)} – $${max.toFixed(2)}`
}

function statusVariant(status: string | undefined) {
  if (status === "ACTIVE") return "default"
  if (status === "ARCHIVED") return "outline"
  return "secondary"
}

export function ProductsPage() {
  const { page: rawPage, titleContains, status } = useSearch({ from: "/_authenticated/products/" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", page, titleContains, status],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/products", {
        params: {
          query: {
            page,
            size: PAGE_SIZE,
            titleContains: titleContains || undefined,
            status: (status as "DRAFT" | "ACTIVE" | "ARCHIVED" | undefined) || undefined,
          },
        },
      })
      if (error) throw error
      return data
    },
  })

  const products = (data?.data?.content ?? []) as Product[]
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
    setSelectedIds(new Set())
  }

  const bulkStatusMutation = useMutation({
    mutationFn: (newStatus: string) => bulkChangeProductStatus([...selectedIds], newStatus),
    onSuccess: invalidate,
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteProducts([...selectedIds]),
    onSuccess: invalidate,
  })

  function toggleAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p) => String(p.id))))
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
    void navigate({ to: "/products", search: { page: newPage, titleContains, status }, replace: true })
  }

  function setStatus(newStatus: string | undefined) {
    setSelectedIds(new Set())
    void navigate({ to: "/products", search: { page: 0, titleContains, status: newStatus }, replace: true })
  }

  const allChecked = products.length > 0 && selectedIds.size === products.length
  const someChecked = selectedIds.size > 0 && selectedIds.size < products.length
  const isBusy = bulkStatusMutation.isPending || bulkDeleteMutation.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild size="sm">
          <Link to="/products/new">
            <Plus className="mr-2 size-4" />
            Add product
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              (status ?? undefined) === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={titleContains ?? ""}
            onChange={(e) => {
              void navigate({
                to: "/products",
                search: { page: 0, titleContains: e.target.value || undefined, status },
                replace: true,
              })
            }}
          />
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => bulkStatusMutation.mutate("ACTIVE")}
          >
            Set Active
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => bulkStatusMutation.mutate("DRAFT")}
          >
            Set Draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => bulkStatusMutation.mutate("ARCHIVED")}
          >
            Archive
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isBusy}
            onClick={() => {
              if (confirm(`Delete ${selectedIds.size} product(s)? This cannot be undone.`)) {
                bulkDeleteMutation.mutate()
              }
            }}
          >
            <Trash2 className="mr-1 size-3" />
            Delete
          </Button>
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
              <TableHead className="w-[38%]">Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No products yet.{" "}
                  <Link to="/products/new" className="underline">Add your first product</Link>
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => {
              const id = String(p.id)
              const thumb = p.images?.[0]
              const variantCount = p.variants?.length ?? 0
              const checked = selectedIds.has(id)
              return (
                <TableRow key={id} data-state={checked ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOne(id)}
                      aria-label={`Select ${p.title ?? "product"}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {thumb?.url ? (
                          <img src={thumb.url} alt={thumb.altText ?? ""} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to="/products/$productId"
                          params={{ productId: id }}
                          className="font-medium hover:underline truncate block"
                        >
                          {p.title ?? "Untitled"}
                        </Link>
                        {p.handle && (
                          <p className="text-xs text-muted-foreground font-mono truncate">{p.handle}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>
                      {p.status ?? "DRAFT"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {variantCount} variant{variantCount !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.productType ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.vendor ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {priceRange(p)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="product" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
