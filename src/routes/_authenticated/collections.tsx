import { createFileRoute } from "@tanstack/react-router"
import { CollectionsPage } from "@/pages/collections"

export const Route = createFileRoute("/_authenticated/collections")({
  validateSearch: (search: Record<string, unknown>): {
    page?: number
    titleContains?: string
    collectionType?: string
  } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
    collectionType: typeof search.collectionType === "string" ? search.collectionType : undefined,
  }),
  component: CollectionsPage,
})
