import { createFileRoute } from "@tanstack/react-router"
import { InventoryPage } from "@/pages/inventory"

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
})
