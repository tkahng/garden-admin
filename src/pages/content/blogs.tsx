import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataPagination } from "@/components/ui/data-pagination"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Blog = components["schemas"]["AdminBlogResponse"]

const PAGE_SIZE = 20

function BlogDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Blog | null
  onSuccess: () => void
}) {
  const [title, setTitle] = useState(editing?.title ?? "")
  const [handle, setHandle] = useState(editing?.handle ?? "")

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/blogs", {
        body: { title, handle: handle || undefined },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Blog created"); onSuccess() },
    onError: () => toast.error("Failed to create blog"),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/blogs/{id}", {
        params: { path: { id: editing!.id! } },
        body: { title, handle: handle || undefined },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Blog updated"); onSuccess() },
    onError: () => toast.error("Failed to update blog"),
  })

  function handleSubmit() {
    if (!title.trim()) { toast.error("Title is required"); return }
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit blog" : "New blog"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="My blog"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Handle <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="my-blog"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BlogsPage() {
  const { page: rawPage, titleContains } = useSearch({ from: "/_authenticated/blogs" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "blogs", page, titleContains],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blogs", {
        params: { query: { page, pageSize: PAGE_SIZE, titleContains: titleContains || undefined } },
      })
      if (error) throw error
      return (data as { data?: { content?: Blog[]; meta?: { total?: number } } } | undefined)?.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/blogs/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Blog deleted")
      setDeleteTarget(null)
      void qc.invalidateQueries({ queryKey: ["admin", "blogs"] })
    },
    onError: () => toast.error("Failed to delete blog"),
  })

  const blogs = data?.content ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/blogs", search: { page: newPage, titleContains }, replace: true })
  }

  function handleDialogSuccess() {
    setDialogOpen(false)
    setEditingBlog(null)
    void qc.invalidateQueries({ queryKey: ["admin", "blogs"] })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Blogs</h1>
        <Button size="sm" onClick={() => { setEditingBlog(null); setDialogOpen(true) }}>
          <Plus className="size-4 mr-2" />
          New blog
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search blogs…"
            className="pl-9"
            value={titleContains ?? ""}
            onChange={(e) =>
              void navigate({ to: "/blogs", search: { page: 0, titleContains: e.target.value || undefined }, replace: true })
            }
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">Loading…</TableCell>
              </TableRow>
            )}
            {!isLoading && blogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">No blogs yet.</TableCell>
              </TableRow>
            )}
            {blogs.map((b) => (
              <TableRow key={b.id} className="group">
                <TableCell>
                  <Link
                    to="/blogs/$blogId"
                    params={{ blogId: b.id! }}
                    className="font-medium hover:underline"
                  >
                    {b.title ?? "Untitled"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{b.handle ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => { setEditingBlog(b); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => setDeleteTarget(b)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="blog" onPageChange={setPage} />
        )}
      </div>

      <BlogDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingBlog(null) }}
        editing={editingBlog}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the blog and all its articles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id!)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
