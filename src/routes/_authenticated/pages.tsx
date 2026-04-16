import { createFileRoute } from "@tanstack/react-router"
import { PagesPage } from "@/pages/content/pages"

export const Route = createFileRoute("/_authenticated/pages")({
  validateSearch: (search: Record<string, unknown>): { page?: number; titleContains?: string; status?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: PagesPage,
})
