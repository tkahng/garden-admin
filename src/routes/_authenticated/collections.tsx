import { createFileRoute } from "@tanstack/react-router"
import { CollectionsPage } from "@/pages/collections"

export const Route = createFileRoute("/_authenticated/collections")({
  component: CollectionsPage,
})
