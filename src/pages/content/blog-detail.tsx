import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
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
import { ArrowLeft, Plus, Pencil, Trash2, Globe, EyeOff, X, Image } from "lucide-react"
import { toast } from "sonner"

type Blog = components["schemas"]["AdminBlogResponse"]
type Article = components["schemas"]["AdminArticleResponse"]
type ArticleImage = components["schemas"]["ArticleImageResponse"]

const PAGE_SIZE = 20

function fmt(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"
}

// ─── Article dialog (create / edit) ──────────────────────────────────────────

function ArticleDialog({
  blogId,
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  blogId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Article | null
  onSuccess: (article: Article) => void
}) {
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [body, setBody] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [tags, setTags] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [tab, setTab] = useState<"content" | "seo">("content")

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "")
      setHandle(editing?.handle ?? "")
      setBody(editing?.body ?? "")
      setExcerpt(editing?.excerpt ?? "")
      setTags((editing?.tags ?? []).join(", "))
      setMetaTitle(editing?.metaTitle ?? "")
      setMetaDescription(editing?.metaDescription ?? "")
      setTab("content")
    }
  }, [open, editing])

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST("/api/v1/admin/blogs/{id}/articles", {
        params: { path: { id: blogId } },
        body: {
          title,
          handle: handle || undefined,
          body: body || undefined,
          excerpt: excerpt || undefined,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        },
      })
      if (error) throw error
      return (data as { data?: Article } | undefined)?.data!
    },
    onSuccess: (article) => { toast.success("Article created"); onSuccess(article) },
    onError: () => toast.error("Failed to create article"),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.PUT(
        "/api/v1/admin/blogs/{id}/articles/{articleId}",
        {
          params: { path: { id: blogId, articleId: editing!.id! } },
          body: {
            title,
            handle: handle || undefined,
            body: body || undefined,
            excerpt: excerpt || undefined,
            tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            metaTitle: metaTitle || undefined,
            metaDescription: metaDescription || undefined,
          },
        },
      )
      if (error) throw error
      return (data as { data?: Article } | undefined)?.data!
    },
    onSuccess: (article) => { toast.success("Article saved"); onSuccess(article) },
    onError: () => toast.error("Failed to save article"),
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
          <DialogTitle>{editing ? "Edit article" : "New article"}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
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
                  placeholder="Article title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Handle <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="article-slug"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Excerpt</Label>
                <Textarea
                  placeholder="Short summary…"
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  placeholder="Article content (HTML or markdown)…"
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="resize-none text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input
                  placeholder="news, update, announcement"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
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

// ─── Article images panel ─────────────────────────────────────────────────────

function ArticleImagesDialog({
  blogId,
  article,
  open,
  onOpenChange,
}: {
  blogId: string
  article: Article
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const qc = useQueryClient()
  const [blobId, setBlobId] = useState("")
  const [altText, setAltText] = useState("")

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST(
        "/api/v1/admin/blogs/{id}/articles/{articleId}/images",
        {
          params: { path: { id: blogId, articleId: article.id! } },
          body: { blobId, altText: altText || undefined },
        },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Image added")
      setBlobId("")
      setAltText("")
      void qc.invalidateQueries({ queryKey: ["admin", "blog", blogId, "articles"] })
    },
    onError: () => toast.error("Failed to add image"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await apiClient.DELETE(
        "/api/v1/admin/blogs/{id}/articles/{articleId}/images/{imageId}",
        { params: { path: { id: blogId, articleId: article.id!, imageId } } },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Image removed")
      void qc.invalidateQueries({ queryKey: ["admin", "blog", blogId, "articles"] })
    },
    onError: () => toast.error("Failed to remove image"),
  })

  const images: ArticleImage[] = article.images ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Images — {article.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Existing images */}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-muted aspect-square">
                  {img.url ? (
                    <img src={img.url} alt={img.altText ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image className="size-8 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(img.id!)}
                    disabled={deleteMutation.isPending}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <X className="size-3 text-white" />
                  </button>
                  {img.altText && (
                    <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1.5 py-0.5 truncate">
                      {img.altText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No images yet.</p>
          )}

          {/* Add image by blob ID */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium">Add image by blob ID</p>
            <div className="space-y-1.5">
              <Input
                placeholder="Blob UUID from media library"
                value={blobId}
                onChange={(e) => setBlobId(e.target.value)}
                className="text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Input
                placeholder="Alt text (optional)"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!blobId.trim() || addMutation.isPending}
            >
              <Plus className="size-3.5 mr-1.5" />
              Add image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Blog detail page ─────────────────────────────────────────────────────────

export function BlogDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<"" | "DRAFT" | "PUBLISHED">("")
  const [articleDialogOpen, setArticleDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [imagesArticle, setImagesArticle] = useState<Article | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)

  const { data: blogData, isLoading: blogLoading } = useQuery({
    queryKey: ["admin", "blog", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blogs/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return (data as { data?: Blog } | undefined)?.data
    },
  })

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["admin", "blog", id, "articles", page, statusFilter],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blogs/{id}/articles", {
        params: {
          path: { id },
          query: {
            page,
            pageSize: PAGE_SIZE,
            status: (statusFilter as "DRAFT" | "PUBLISHED") || undefined,
          },
        },
      })
      if (error) throw error
      return (data as { data?: { content?: Article[]; meta?: { total?: number } } } | undefined)?.data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ articleId, status }: { articleId: string; status: "DRAFT" | "PUBLISHED" }) => {
      const { data, error } = await apiClient.PATCH(
        "/api/v1/admin/blogs/{id}/articles/{articleId}/status",
        {
          params: { path: { id, articleId } },
          body: { status },
        },
      )
      if (error) throw error
      return (data as { data?: Article } | undefined)?.data
    },
    onSuccess: () => {
      toast.success("Status updated")
      void qc.invalidateQueries({ queryKey: ["admin", "blog", id, "articles"] })
    },
    onError: () => toast.error("Failed to update status"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await apiClient.DELETE(
        "/api/v1/admin/blogs/{id}/articles/{articleId}",
        { params: { path: { id, articleId } } },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Article deleted")
      setDeleteTarget(null)
      void qc.invalidateQueries({ queryKey: ["admin", "blog", id, "articles"] })
    },
    onError: () => toast.error("Failed to delete article"),
  })

  const blog = blogData
  const articles = articlesData?.content ?? []
  const total = articlesData?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  const STATUS_TABS = [
    { label: "All", value: "" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Draft", value: "DRAFT" },
  ] as const

  if (blogLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!blog) {
    return (
      <div>
        <p className="text-muted-foreground">Blog not found.</p>
        <Link to="/blogs" search={{}} className="text-sm underline mt-2 block">← Back to blogs</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link to="/blogs" search={{}} className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" />
          Blogs
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{blog.title}</h1>
            {blog.handle && (
              <p className="text-sm text-muted-foreground font-mono mt-0.5">/{blog.handle}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingArticle(null); setArticleDialogOpen(true) }}
          >
            <Plus className="size-4 mr-2" />
            New article
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => { setStatusFilter(tab.value); setPage(0) }}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              statusFilter === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Articles table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {articlesLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">Loading…</TableCell>
              </TableRow>
            )}
            {!articlesLoading && articles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                  No articles yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
            {articles.map((article) => (
              <TableRow key={article.id} className="group">
                <TableCell>
                  <p className="font-medium">{article.title ?? "Untitled"}</p>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.excerpt}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={article.status === "PUBLISHED" ? "default" : "secondary"}
                    className="text-xs cursor-pointer"
                    onClick={() =>
                      statusMutation.mutate({
                        articleId: article.id!,
                        status: article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                      })
                    }
                  >
                    {article.status === "PUBLISHED" ? (
                      <><Globe className="size-3 mr-1" />Published</>
                    ) : (
                      <><EyeOff className="size-3 mr-1" />Draft</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {fmt(article.publishedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(article.tags ?? []).slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                    {(article.tags ?? []).length > 3 && (
                      <span className="text-xs text-muted-foreground">+{(article.tags ?? []).length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Manage images"
                      onClick={() => setImagesArticle(article)}
                    >
                      <Image className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => { setEditingArticle(article); setArticleDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => setDeleteTarget(article)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!articlesLoading && totalPages > 1 && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="article" onPageChange={setPage} />
        )}
      </div>

      {/* Article create/edit dialog */}
      <ArticleDialog
        blogId={id}
        open={articleDialogOpen}
        onOpenChange={(v) => { setArticleDialogOpen(v); if (!v) setEditingArticle(null) }}
        editing={editingArticle}
        onSuccess={() => {
          setArticleDialogOpen(false)
          setEditingArticle(null)
          void qc.invalidateQueries({ queryKey: ["admin", "blog", id, "articles"] })
        }}
      />

      {/* Images dialog */}
      {imagesArticle && (
        <ArticleImagesDialog
          blogId={id}
          article={imagesArticle}
          open={!!imagesArticle}
          onOpenChange={(v) => { if (!v) setImagesArticle(null) }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the article and all its images.
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
