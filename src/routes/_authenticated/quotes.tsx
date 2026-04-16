import { createFileRoute } from "@tanstack/react-router"
import { QuotesPage } from "@/pages/quotes"

export const Route = createFileRoute("/_authenticated/quotes")({
  validateSearch: (search: Record<string, unknown>): { page?: number; status?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: QuotesPage,
})
