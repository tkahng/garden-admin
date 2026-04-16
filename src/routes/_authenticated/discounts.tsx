import { createFileRoute } from "@tanstack/react-router"
import { DiscountsPage } from "@/pages/discounts"

export const Route = createFileRoute("/_authenticated/discounts")({
  validateSearch: (search: Record<string, unknown>): { page?: number; codeContains?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    codeContains: typeof search.codeContains === "string" ? search.codeContains : undefined,
  }),
  component: DiscountsPage,
})
