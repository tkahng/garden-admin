import { createFileRoute } from "@tanstack/react-router"
import { GiftCardsPage } from "@/pages/gift-cards"

export const Route = createFileRoute("/_authenticated/gift-cards")({
  component: GiftCardsPage,
})
