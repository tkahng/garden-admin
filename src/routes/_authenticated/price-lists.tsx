import { createFileRoute } from "@tanstack/react-router"
import { PriceListsPage } from "@/pages/price-lists"

export const Route = createFileRoute("/_authenticated/price-lists")({
  component: PriceListsPage,
})
