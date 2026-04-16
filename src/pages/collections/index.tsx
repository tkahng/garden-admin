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
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

const TYPE_TABS = [
  { label: "All", value: undefined },
  { label: "Manual", value: "MANUAL" },
  { label: "Automated", value: "AUTOMATED" },
] as const

export function CollectionsPage() {
  const { page: rawPage, titleContains, collectionType } = useSearch({ from: "/_authenticated/collections" })
  const page = rawPage ?? 0
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "collections", page, titleContains, collectionType],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/collections", {
        params: {
          query: {
            page,
            size: PAGE_SIZE,
            titleContains: titleContains || undefined,
            collectionType: (collectionType as "MANUAL" | "AUTOMATED" | undefined) || undefined,
          },
        },
      })
      if (error) throw error
      return data
    },
  })

  const collections = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/collections", search: { page: newPage, titleContains, collectionType }, replace: true })
  }

  function setType(newType: string | undefined) {
    void navigate({ to: "/collections", search: { page: 0, titleContains, collectionType: newType }, replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <Button asChild size="sm">
          <Link to="/collections/new">
            <Plus className="mr-2 size-4" />
            Create collection
          </Link>
        </Button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 border-b">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setType(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              (collectionType ?? undefined) === tab.value
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
            placeholder="Search collections..."
            className="pl-9"
            value={titleContains ?? ""}
            onChange={(e) => {
              void navigate({
                to: "/collections",
                search: { page: 0, titleContains: e.target.value || undefined, collectionType },
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
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && collections.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  No collections yet.{" "}
                  <Link to="/collections/new" className="underline">Create your first collection</Link>
                </TableCell>
              </TableRow>
            )}
            {collections.map((c) => (
              <TableRow key={String(c.id)}>
                <TableCell>
                  <Link
                    to="/collections/$collectionId"
                    params={{ collectionId: String(c.id) }}
                    className="font-medium hover:underline"
                  >
                    {String(c.title ?? "Untitled")}
                  </Link>
                  {c.handle && (
                    <p className="text-xs text-muted-foreground font-mono">{c.handle}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {c.collectionType === "MANUAL" ? "Manual" : "Automated"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={String(c.status) === "ACTIVE" ? "default" : "secondary"}>
                    {String(c.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.productCount != null ? String(c.productCount) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="collection" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
