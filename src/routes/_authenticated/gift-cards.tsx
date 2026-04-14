import { createFileRoute } from "@tanstack/react-router"
import { GiftCardsPage } from "@/pages/gift-cards"

export const Route = createFileRoute("/_authenticated/gift-cards")({
  validateSearch: (search: Record<string, unknown>): { page?: number; codeContains?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    codeContains: typeof search.codeContains === "string" ? search.codeContains : undefined,
  }),
  component: GiftCardsPage,
})
