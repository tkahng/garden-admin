import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
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

export function BlogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "blogs"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blogs", {})
      if (error) throw error
      return data
    },
  })

  const blogs = (data as { content?: Record<string, unknown>[] } | undefined)?.content ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Blogs</h1>
        <Button asChild size="sm">
          <Link to={"/blogs/new" as string}>
            <Plus className="size-4 mr-2" />
            Add blog
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Articles</TableHead>
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
            {!isLoading && blogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                  No blogs yet.
                </TableCell>
              </TableRow>
            )}
            {blogs.map((b: Record<string, unknown>) => (
              <TableRow key={String(b.id)}>
                <TableCell>
                  <Link to={`/blogs/${b.id}` as string} className="font-medium hover:underline">
                    {String(b.title ?? "Untitled")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {String(b.handle ?? "—")}
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
