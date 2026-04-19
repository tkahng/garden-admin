import { createFileRoute } from "@tanstack/react-router"
import { InvoiceDetailPage } from "@/pages/invoices/detail"

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  component: function InvoiceDetailRoute() {
    const { invoiceId } = Route.useParams()
    return <InvoiceDetailPage id={invoiceId} />
  },
})
