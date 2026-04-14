import { Link } from "react-router"
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

export function PagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pages"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/pages", {})
      if (error) throw error
      return data
    },
  })

  const pages = (data as { content?: Record<string, unknown>[] } | undefined)?.content ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <Button asChild size="sm">
          <Link to="/pages/new">
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
            {pages.map((p: Record<string, unknown>) => (
              <TableRow key={String(p.id)}>
                <TableCell>
                  <Link to={`/pages/${p.id}`} className="font-medium hover:underline">
                    {String(p.title ?? "Untitled")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {String(p.handle ?? "—")}
                </TableCell>
                <TableCell>
                  <Badge variant={String(p.status) === "ACTIVE" ? "default" : "secondary"}>
                    {String(p.status ?? "DRAFT")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
