import { createFileRoute } from "@tanstack/react-router"
import { MediaPage } from "@/pages/content/media"

export const Route = createFileRoute("/_authenticated/media")({
  validateSearch: (search: Record<string, unknown>): {
    page?: number
    contentType?: string
    q?: string
  } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    contentType: typeof search.contentType === "string" ? search.contentType : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: MediaPage,
})
