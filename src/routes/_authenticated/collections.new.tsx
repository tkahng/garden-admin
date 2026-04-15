import { createFileRoute } from "@tanstack/react-router"
import { NewCollectionPage } from "@/pages/collections/new"

export const Route = createFileRoute("/_authenticated/collections/new")({
  component: NewCollectionPage,
})
