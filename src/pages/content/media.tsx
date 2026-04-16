import { useState, useRef, useCallback } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"
import {
  Search,
  Upload,
  Trash2,
  X,
  Image,
  FileText,
  Film,
  File,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

type BlobResponse = components["schemas"]["BlobResponse"]

const PAGE_SIZE = 24

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function MediaIcon({ contentType, className }: { contentType?: string; className?: string }) {
  if (!contentType) return <File className={className} />
  if (contentType.startsWith("image/")) return <Image className={className} />
  if (contentType.startsWith("video/")) return <Film className={className} />
  if (contentType.startsWith("text/") || contentType.includes("pdf")) return <FileText className={className} />
  return <File className={className} />
}

function MediaThumbnail({ blob, selected, onSelect, onClick }: {
  blob: BlobResponse
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onClick: (blob: BlobResponse) => void
}) {
  const isImage = blob.contentType?.startsWith("image/")

  return (
    <div
      className={cn(
        "group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
      )}
      onClick={() => onClick(blob)}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-muted flex items-center justify-center">
        {isImage && blob.url ? (
          <img
            src={blob.url}
            alt={blob.alt ?? blob.filename ?? ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <MediaIcon contentType={blob.contentType} className="size-10 text-muted-foreground" />
        )}
      </div>

      {/* Checkbox */}
      <div
        className={cn(
          "absolute top-2 left-2 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(blob.id!, !selected)
        }}
      >
        <Checkbox
          checked={selected}
          className="bg-white border-white shadow"
        />
      </div>

      {/* Filename */}
      <div className="px-2 py-1.5 bg-card">
        <p className="text-xs truncate text-muted-foreground">{blob.filename}</p>
      </div>
    </div>
  )
}

function DetailPanel({ blob, onClose, onDeleted }: {
  blob: BlobResponse
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const [alt, setAlt] = useState(blob.alt ?? "")
  const [title, setTitle] = useState(blob.title ?? "")
  const isImage = blob.contentType?.startsWith("image/")

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.PATCH("/api/v1/admin/blobs/{id}", {
        params: { path: { id: blob.id! } },
        body: { alt, title },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success("File updated")
      void queryClient.invalidateQueries({ queryKey: ["admin", "blobs"] })
    },
    onError: () => toast.error("Failed to update file"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.DELETE("/api/v1/admin/blobs/{id}", {
        params: { path: { id: blob.id! } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("File deleted")
      void queryClient.invalidateQueries({ queryKey: ["admin", "blobs"] })
      onDeleted(blob.id!)
    },
    onError: () => toast.error("Failed to delete file"),
  })

  const { data: usagesData } = useQuery({
    queryKey: ["admin", "blobs", blob.id, "usages"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blobs/{id}/usages", {
        params: { path: { id: blob.id! } },
      })
      if (error) throw error
      return data?.data ?? []
    },
  })

  return (
    <div className="w-80 border-l bg-card flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-medium">File details</span>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="p-4 border-b">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {isImage && blob.url ? (
              <img src={blob.url} alt={blob.alt ?? ""} className="w-full h-full object-contain" />
            ) : (
              <MediaIcon contentType={blob.contentType} className="size-16 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="px-4 py-3 border-b space-y-1 text-sm">
          <p className="font-medium truncate">{blob.filename}</p>
          <div className="text-muted-foreground space-y-0.5">
            <p>{blob.contentType}</p>
            {blob.size != null && <p>{formatBytes(blob.size)}</p>}
            {blob.width && blob.height && <p>{blob.width} × {blob.height} px</p>}
            {blob.createdAt && <p>{formatDate(blob.createdAt)}</p>}
          </div>
          {blob.url && (
            <a
              href={blob.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              Open original <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {/* Edit alt/title (images only) */}
        {isImage && (
          <div className="px-4 py-3 border-b space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Alt text</Label>
              <Input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image..."
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Used for accessibility and SEO.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title..."
                className="text-sm"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        )}

        {/* Usages */}
        {usagesData && usagesData.length > 0 && (
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-medium mb-2">Used in</p>
            <div className="space-y-1">
              {usagesData.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{u.entityType}</Badge>
                  <span className="text-xs text-muted-foreground font-mono truncate">{u.entityId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {usagesData && usagesData.length === 0 && (
          <div className="px-4 py-3 border-b">
            <p className="text-xs text-muted-foreground">Not used anywhere.</p>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="px-4 py-3 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            if (confirm(`Delete "${blob.filename}"?`)) {
              deleteMutation.mutate()
            }
          }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="size-4 mr-2" />
          Delete file
        </Button>
      </div>
    </div>
  )
}

function DropZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onUpload(files)
    },
    [onUpload]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-lg px-6 py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50"
      )}
    >
      <Upload className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">Drop files here or click to upload</p>
      <p className="text-xs text-muted-foreground">Images, videos, documents</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onUpload(files)
          e.target.value = ""
        }}
      />
    </div>
  )
}

export function MediaPage() {
  const { page: rawPage, contentType: rawContentType, q } = useSearch({ from: "/_authenticated/media" })
  const page = rawPage ?? 0
  const contentType = rawContentType ?? ""
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeBlob, setActiveBlob] = useState<BlobResponse | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "blobs", page, contentType, q],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blobs", {
        params: {
          query: {
            page,
            size: PAGE_SIZE,
            contentType: contentType || undefined,
            filenameContains: q || undefined,
            sortBy: "createdAt",
            sortDir: "desc",
          },
        },
      })
      if (error) throw error
      return data
    },
  })

  const blobs = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/blobs", {
        body: { ids },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.size} file${selectedIds.size > 1 ? "s" : ""}`)
      setSelectedIds(new Set())
      if (activeBlob && selectedIds.has(activeBlob.id!)) setActiveBlob(null)
      void queryClient.invalidateQueries({ queryKey: ["admin", "blobs"] })
    },
    onError: () => toast.error("Bulk delete failed"),
  })

  async function handleUpload(files: File[]) {
    setUploading(true)
    let uploaded = 0
    let failed = 0
    for (const file of files) {
      try {
        const { error } = await apiClient.POST("/api/v1/admin/blobs", {
          body: { file: file as unknown as string },
          bodySerializer: () => {
            const fd = new FormData()
            fd.append("file", file)
            return fd
          },
        })
        if (error) failed++
        else uploaded++
      } catch {
        failed++
      }
    }
    setUploading(false)
    if (uploaded > 0) {
      toast.success(`Uploaded ${uploaded} file${uploaded > 1 ? "s" : ""}`)
      void queryClient.invalidateQueries({ queryKey: ["admin", "blobs"] })
    }
    if (failed > 0) toast.error(`${failed} upload${failed > 1 ? "s" : ""} failed`)
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(blobs.map((b) => b.id!).filter(Boolean)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function setPage(newPage: number) {
    void navigate({ to: "/media", search: { page: newPage, contentType: contentType || undefined, q: q || undefined }, replace: true })
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-semibold">Media library</h1>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.size} file${selectedIds.size > 1 ? "s" : ""}?`)) {
                      bulkDeleteMutation.mutate(Array.from(selectedIds))
                    }
                  }}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              className="pl-9"
              value={q ?? ""}
              onChange={(e) => {
                void navigate({
                  to: "/media",
                  search: { page: 0, contentType: contentType || undefined, q: e.target.value || undefined },
                  replace: true,
                })
              }}
            />
          </div>
          <Select
            value={contentType || "all"}
            onValueChange={(val) => {
              void navigate({
                to: "/media",
                search: { page: 0, contentType: val === "all" ? undefined : val, q: q || undefined },
                replace: true,
              })
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image/">Images</SelectItem>
              <SelectItem value="video/">Videos</SelectItem>
              <SelectItem value="application/pdf">PDFs</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={blobs.length > 0 && selectedIds.size < blobs.length ? selectAll : clearSelection}>
            {selectedIds.size === blobs.length && blobs.length > 0 ? "Deselect all" : "Select all"}
          </Button>
        </div>

        {/* Upload zone */}
        <div className="px-6 py-3 shrink-0">
          <DropZone onUpload={handleUpload} />
          {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading...</p>}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : blobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Image className="size-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No files found</p>
              <p className="text-xs text-muted-foreground mt-1">Upload files using the drop zone above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {blobs.map((blob) => (
                <MediaThumbnail
                  key={blob.id}
                  blob={blob}
                  selected={selectedIds.has(blob.id!)}
                  onSelect={toggleSelect}
                  onClick={(b) => setActiveBlob(activeBlob?.id === b.id ? null : b)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="border-t shrink-0">
            <DataPagination
              page={page}
              totalPages={totalPages}
              total={total}
              label="file"
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Detail panel */}
      {activeBlob && (
        <DetailPanel
          blob={activeBlob}
          onClose={() => setActiveBlob(null)}
          onDeleted={(id) => {
            if (activeBlob?.id === id) setActiveBlob(null)
          }}
        />
      )}
    </div>
  )
}
