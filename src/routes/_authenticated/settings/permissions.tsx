import { createFileRoute } from "@tanstack/react-router"
import { PermissionsPage } from "@/pages/settings/permissions"

export const Route = createFileRoute("/_authenticated/settings/permissions")({
  component: PermissionsPage,
})
