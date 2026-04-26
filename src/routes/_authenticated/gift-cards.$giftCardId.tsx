import { createFileRoute } from "@tanstack/react-router"
import { GiftCardDetailPage } from "@/pages/gift-cards/detail"

export const Route = createFileRoute("/_authenticated/gift-cards/$giftCardId")({
  component: function GiftCardDetailRoute() {
    const { giftCardId } = Route.useParams()
    return <GiftCardDetailPage id={giftCardId} />
  },
})
