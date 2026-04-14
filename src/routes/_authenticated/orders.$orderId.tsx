import { createFileRoute } from "@tanstack/react-router"
import { OrderDetailPage } from "@/pages/orders/detail"

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: function OrderDetailRoute() {
    const { orderId } = Route.useParams()
    return <OrderDetailPage id={orderId} />
  },
})
