import { createFileRoute } from "@tanstack/react-router"
import { ShippingPage } from "@/pages/settings/shipping"

export const Route = createFileRoute("/_authenticated/settings/shipping")({
  component: ShippingPage,
})
