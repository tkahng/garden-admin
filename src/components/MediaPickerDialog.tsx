import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"
import { Search, Upload, Image, FileText, Film, File, Play } from "lucide-react"

function PdfCard() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white dark:bg-muted">
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-muted-foreground/20 bg-background shadow-sm w-11 h-14">
        <FileText className="size-5 text-muted-foreground/40" />
        <span className="text-[9px] font-bold tracking-wider text-red-500 mt-0.5">PDF</span>
      </div>
    </div>
  )
}
import { toast } from "sonner"

type BlobResponse = components["schemas"]["BlobResponse"]

const PICKER_PAGE_SIZE = 32

function MediaIcon({ contentType, className }: { contentType?: string; className?: string }) {
  if (!contentType) return <File className={className} />
  if (contentType.startsWith("image/")) return <Image className={className} />
  if (contentType.startsWith("video/")) return <Film className={className} />
  if (contentType.startsWith("text/") || contentType.includes("pdf")) return <FileText className={className} />
  return <File className={className} />
}

function PickerThumbnail({
  blob,
  selected,
  onToggle,
}: {
  blob: BlobResponse
  selected: boolean
  onToggle: () => void
}) {
  const isImage = blob.contentType?.startsWith("image/")
  const isVideo = blob.contentType?.startsWith("video/")
  const isPdf = blob.contentType === "application/pdf"
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all text-left w-full",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-muted-foreground/30",
      )}
    >
      <div className="w-full h-full bg-muted flex items-center justify-center">
        {isImage && blob.url ? (
          <img src={blob.url} alt={blob.alt ?? blob.filename ?? ""} className="w-full h-full object-cover" />
        ) : isVideo && blob.url ? (
          <div className="relative w-full h-full">
            <video
              src={blob.url}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="size-6 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="size-3 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>
        ) : isPdf ? (
          <PdfCard />
        ) : (
          <MediaIcon contentType={blob.contentType} className="size-8 text-muted-foreground" />
        )}
      </div>
      {selected && (
        <div className="absolute inset-0 bg-primary/15 flex items-start justify-end p-1.5">
          <div className="size-5 rounded-full bg-primary flex items-center justify-center shadow">
            <svg viewBox="0 0 12 12" className="size-3 text-primary-foreground fill-current">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{blob.filename}</p>
      </div>
    </button>
  )
}

function UploadZone({ onUpload, uploading }: { onUpload: (files: File[]) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onUpload(files)
    },
    [onUpload],
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-lg px-4 py-5 flex flex-col items-center gap-1.5 transition-colors",
        uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
      )}
    >
      <Upload className="size-5 text-muted-foreground" />
      <p className="text-xs font-medium text-muted-foreground">
        {uploading ? "Uploading…" : "Drop files or click to upload"}
      </p>
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

// ─── Public props ──────────────────────────────────────────────────────────────

export interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Confirm with the selected blobs. */
  onConfirm: (blobs: BlobResponse[]) => void
  /** Allow selecting more than one file. Default: true */
  multiple?: boolean
  /** Pre-filter by content-type prefix, e.g. "image/". Shows type filter when omitted. */
  accept?: string
  title?: string
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onConfirm,
  multiple = true,
  accept,
  title = "Select from media library",
}: MediaPickerDialogProps) {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [contentType, setContentType] = useState(accept ?? "")
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedBlobs, setSelectedBlobs] = useState<Map<string, BlobResponse>>(new Map())
  const [uploading, setUploading] = useState(false)

  function reset() {
    setSearch("")
    setContentType(accept ?? "")
    setPage(0)
    setSelectedIds(new Set())
    setSelectedBlobs(new Map())
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "blobs", "picker", page, contentType, search],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/blobs", {
        params: {
          query: {
            page,
            size: PICKER_PAGE_SIZE,
            contentType: contentType || undefined,
            filenameContains: search || undefined,
            sortBy: "createdAt",
            sortDir: "desc",
          },
        },
      })
      if (error) throw error
      return data?.data
    },
    enabled: open,
  })

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploading(true)
      let ok = 0
      let fail = 0
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
          if (error) fail++
          else ok++
        } catch {
          fail++
        }
      }
      setUploading(false)
      if (ok > 0) {
        toast.success(`Uploaded ${ok} file${ok > 1 ? "s" : ""}`)
        void qc.invalidateQueries({ queryKey: ["admin", "blobs"] })
        setPage(0)
      }
      if (fail > 0) toast.error(`${fail} upload${fail > 1 ? "s" : ""} failed`)
    },
  })

  const blobs = data?.content ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PICKER_PAGE_SIZE) || 1

  function toggleBlob(blob: BlobResponse) {
    const id = blob.id!
    if (!multiple) {
      if (selectedIds.has(id)) {
        setSelectedIds(new Set())
        setSelectedBlobs(new Map())
      } else {
        setSelectedIds(new Set([id]))
        setSelectedBlobs(new Map([[id, blob]]))
      }
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSelectedBlobs((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, blob)
      return next
    })
  }

  function handleConfirm() {
    onConfirm(Array.from(selectedBlobs.values()))
    handleOpenChange(false)
  }

  const n = selectedIds.size

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename…"
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          {!accept && (
            <Select
              value={contentType || "all"}
              onValueChange={(v) => { setContentType(v === "all" ? "" : v); setPage(0) }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image/">Images</SelectItem>
                <SelectItem value="video/">Videos</SelectItem>
                <SelectItem value="application/pdf">PDFs</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Upload zone */}
        <div className="shrink-0">
          <UploadZone onUpload={(files) => uploadMutation.mutate(files)} uploading={uploading} />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: PICKER_PAGE_SIZE }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : blobs.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              {search || contentType ? "No files match your filters." : "No files yet — upload some above."}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {blobs.map((blob) => (
                <PickerThumbnail
                  key={blob.id}
                  blob={blob}
                  selected={selectedIds.has(blob.id!)}
                  onToggle={() => toggleBlob(blob)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="shrink-0 pt-1">
            <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}

        <DialogFooter className="shrink-0">
          {n > 0 && (
            <span className="text-sm text-muted-foreground mr-auto self-center">
              {n} file{n !== 1 ? "s" : ""} selected
            </span>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={n === 0}>
            {multiple
              ? n > 0 ? `Select ${n} file${n !== 1 ? "s" : ""}` : "Select"
              : n > 0 ? "Select" : "Select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
