import { useState, useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { cn } from "@/lib/utils"
import { Plus, Search, Pencil, Trash2, Globe, EyeOff } from "lucide-react"
import { toast } from "sonner"

type Page = components["schemas"]["AdminPageResponse"]

const PAGE_SIZE = 20

// ─── Page dialog (create / edit) ──────────────────────────────────────────────

function PageDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Page | null
  onSuccess: () => void
}) {
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [body, setBody] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [tab, setTab] = useState<"content" | "seo">("content")

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "")
      setHandle(editing?.handle ?? "")
      setBody(editing?.body ?? "")
      setMetaTitle(editing?.metaTitle ?? "")
      setMetaDescription(editing?.metaDescription ?? "")
      setTab("content")
    }
  }, [open, editing])

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/pages", {
        body: {
          title,
          handle: handle || undefined,
          body: body || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Page created"); onSuccess() },
    onError: () => toast.error("Failed to create page"),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/pages/{id}", {
        params: { path: { id: editing!.id! } },
        body: {
          title,
          handle: handle || undefined,
          body: body || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Page saved"); onSuccess() },
    onError: () => toast.error("Failed to save page"),
  })

  function handleSubmit() {
    if (!title.trim()) { toast.error("Title is required"); return }
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit page" : "New page"}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b -mx-6 px-6">
          {(["content", "seo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors",
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {tab === "content" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  placeholder="About us"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Handle <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="about-us"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  placeholder="Page content (HTML or markdown)…"
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="resize-none text-sm font-mono"
                />
              </div>
            </div>
          )}
          {tab === "seo" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Meta title</Label>
                <Input
                  placeholder="SEO title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Meta description</Label>
                <Textarea
                  placeholder="SEO description…"
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          )}
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

// ─── Pages page ───────────────────────────────────────────────────────────────

export function PagesPage() {
  const { page: rawPage, titleContains, status: statusFilter } = useSearch({ from: "/_authenticated/pages" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pages", page, titleContains, statusFilter],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/pages", {
        params: {
          query: {
            page,
            pageSize: PAGE_SIZE,
            titleContains: titleContains || undefined,
            status: (statusFilter as "DRAFT" | "PUBLISHED") || undefined,
          },
        },
      })
      if (error) throw error
      return (data as { data?: { content?: Page[]; meta?: { total?: number } } } | undefined)?.data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "DRAFT" | "PUBLISHED" }) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/pages/{id}/status", {
        params: { path: { id } },
        body: { status },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Status updated")
      void qc.invalidateQueries({ queryKey: ["admin", "pages"] })
    },
    onError: () => toast.error("Failed to update status"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/pages/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Page deleted")
      setDeleteTarget(null)
      void qc.invalidateQueries({ queryKey: ["admin", "pages"] })
    },
    onError: () => toast.error("Failed to delete page"),
  })

  const pages = data?.content ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/pages", search: { page: newPage, titleContains, status: statusFilter }, replace: true })
  }

  function handleSuccess() {
    setDialogOpen(false)
    setEditingPage(null)
    void qc.invalidateQueries({ queryKey: ["admin", "pages"] })
  }

  const STATUS_TABS = [
    { label: "All", value: "" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Draft", value: "DRAFT" },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <Button size="sm" onClick={() => { setEditingPage(null); setDialogOpen(true) }}>
          <Plus className="size-4 mr-2" />
          New page
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() =>
              void navigate({ to: "/pages", search: { page: 0, titleContains, status: tab.value || undefined }, replace: true })
            }
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              (statusFilter ?? "") === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
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
            placeholder="Search pages…"
            className="pl-9"
            value={titleContains ?? ""}
            onChange={(e) =>
              void navigate({ to: "/pages", search: { page: 0, titleContains: e.target.value || undefined, status: statusFilter }, replace: true })
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
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">Loading…</TableCell>
              </TableRow>
            )}
            {!isLoading && pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No pages yet.</TableCell>
              </TableRow>
            )}
            {pages.map((p) => (
              <TableRow key={p.id} className="group">
                <TableCell className="font-medium">{p.title ?? "Untitled"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{p.handle ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={p.status === "PUBLISHED" ? "default" : "secondary"}
                    className="cursor-pointer select-none"
                    onClick={() =>
                      statusMutation.mutate({
                        id: p.id!,
                        status: p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                      })
                    }
                  >
                    {p.status === "PUBLISHED" ? (
                      <><Globe className="size-3 mr-1" />Published</>
                    ) : (
                      <><EyeOff className="size-3 mr-1" />Draft</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => { setEditingPage(p); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => setDeleteTarget(p)}
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
          <DataPagination page={page} totalPages={totalPages} total={total} label="page" onPageChange={setPage} />
        )}
      </div>

      <PageDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingPage(null) }}
        editing={editingPage}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the page.
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
