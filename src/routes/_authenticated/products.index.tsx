import { createFileRoute } from "@tanstack/react-router"
import { ProductsPage } from "@/pages/products"

export const Route = createFileRoute("/_authenticated/products/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { page?: number; titleContains?: string; status?: string; vendor?: string; productType?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    titleContains:
      typeof search.titleContains === "string"
        ? search.titleContains
        : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    vendor: typeof search.vendor === "string" ? search.vendor : undefined,
    productType: typeof search.productType === "string" ? search.productType : undefined,
  }),
  component: ProductsPage,
})
