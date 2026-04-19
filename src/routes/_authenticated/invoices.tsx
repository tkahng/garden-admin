import { createFileRoute } from "@tanstack/react-router"
import { InvoicesPage } from "@/pages/invoices/index"

export const Route = createFileRoute("/_authenticated/invoices")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { page?: number; status?: string; companyId?: string } => ({
    page: s.page !== undefined ? Number(s.page) : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    companyId: typeof s.companyId === "string" ? s.companyId : undefined,
  }),
  component: InvoicesPage,
})
