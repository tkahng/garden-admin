import { createFileRoute } from "@tanstack/react-router"
import { LocationsPage } from "@/pages/settings/locations"

export const Route = createFileRoute("/_authenticated/settings/locations")({
  component: LocationsPage,
})
