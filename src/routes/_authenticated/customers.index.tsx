import { createFileRoute } from "@tanstack/react-router"
import { CustomersPage } from "@/pages/customers"

export const Route = createFileRoute("/_authenticated/customers/")({
  validateSearch: (search: Record<string, unknown>): { page?: number; email?: string; status?: string } => ({
    page: search.page !== undefined ? Number(search.page) : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: CustomersPage,
})
