import { createFileRoute } from "@tanstack/react-router"
import { OrdersPage } from "@/pages/orders"

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (search: Record<string, unknown>): { page?: number; status?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: OrdersPage,
})
