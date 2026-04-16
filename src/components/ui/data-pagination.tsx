import { Button } from "@/components/ui/button"

interface DataPaginationProps {
  page: number
  totalPages: number
  total: number
  label: string
  onPageChange: (page: number) => void
}

function getPageNumbers(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  const pages: (number | "…")[] = []
  const showLeft = page > 2
  const showRight = page < totalPages - 3

  pages.push(0)

  if (showLeft) pages.push("…")

  const start = Math.max(1, page - 1)
  const end = Math.min(totalPages - 2, page + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (showRight) pages.push("…")

  pages.push(totalPages - 1)

  return pages
}

export function DataPagination({ page, totalPages, total, label, onPageChange }: DataPaginationProps) {
  if (total === 0) return null

  const pages = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {total} {label}{total !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          Previous
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="w-8"
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
