import { createFileRoute } from "@tanstack/react-router"
import { OrdersPage } from "@/pages/orders"

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (search: Record<string, unknown>): { page?: number; status?: string; userId?: string; from?: string; to?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    userId: typeof search.userId === "string" ? search.userId : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  component: OrdersPage,
})
