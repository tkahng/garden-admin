import { createFileRoute } from "@tanstack/react-router"
import { BlogsPage } from "@/pages/content/blogs"

export const Route = createFileRoute("/_authenticated/blogs")({
  validateSearch: (search: Record<string, unknown>): { page?: number; titleContains?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
  }),
  component: BlogsPage,
})
