import { createFileRoute } from "@tanstack/react-router"
import { MediaPage } from "@/pages/content/media"

export const Route = createFileRoute("/_authenticated/media")({
  validateSearch: (search: Record<string, unknown>): {
    page?: number
    contentType?: string
    q?: string
    folder?: string
    unorganized?: boolean
  } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    contentType: typeof search.contentType === "string" ? search.contentType : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    folder: typeof search.folder === "string" ? search.folder : undefined,
    unorganized: search.unorganized === true || search.unorganized === "true" ? true : undefined,
  }),
  component: MediaPage,
})
