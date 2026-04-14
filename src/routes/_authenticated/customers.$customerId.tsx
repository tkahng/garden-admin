import { createFileRoute } from "@tanstack/react-router"
import { CustomerDetailPage } from "@/pages/customers/detail"

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  component: function CustomerDetailRoute() {
    const { customerId } = Route.useParams()
    return <CustomerDetailPage id={customerId} />
  },
})
