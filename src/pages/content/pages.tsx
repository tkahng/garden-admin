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
import { DataPagination } from "@/components/ui/data-pagination"

const PAGE_SIZE = 20

export function PagesPage() {
  const { page: rawPage, titleContains } = useSearch({ from: "/_authenticated/pages" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState(titleContains ?? "")

  useEffect(() => { setSearchInput(titleContains ?? "") }, [titleContains])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pages", page, titleContains],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/pages", {
        params: { query: { page, pageSize: PAGE_SIZE, titleContains: titleContains || undefined } },
      })
      if (error) throw error
      return data
    },
  })

  const pages = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/pages", search: { page: newPage, titleContains }, replace: true })
  }

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

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              void navigate({
                to: "/pages",
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
              <TableHead>Title</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">No pages yet.</TableCell>
              </TableRow>
            )}
            {pages.map((p) => (
              <TableRow key={String(p.id)}>
                <TableCell>
                  <Link to={`/pages/${p.id}` as string} className="font-medium hover:underline">
                    {String(p.title ?? "Untitled")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{String(p.handle ?? "—")}</TableCell>
                <TableCell>
                  <Badge variant={String(p.status) === "PUBLISHED" ? "default" : "secondary"}>
                    {String(p.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="page" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
