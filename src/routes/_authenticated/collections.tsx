import { createFileRoute } from "@tanstack/react-router"
import { CollectionsPage } from "@/pages/collections"

export const Route = createFileRoute("/_authenticated/collections")({
  validateSearch: (search: Record<string, unknown>): { page?: number; titleContains?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
  }),
  component: CollectionsPage,
})
