import { createFileRoute } from "@tanstack/react-router"
import { ProductDetailPage } from "@/pages/products/detail"

export const Route = createFileRoute("/_authenticated/products/$productId")({
  component: function ProductDetailRoute() {
    const { productId } = Route.useParams()
    return <ProductDetailPage id={productId} />
  },
})
