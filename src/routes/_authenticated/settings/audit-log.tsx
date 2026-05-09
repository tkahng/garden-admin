import { createFileRoute } from "@tanstack/react-router"
import { AuditLogPage } from "@/pages/audit-log"

export const Route = createFileRoute("/_authenticated/settings/audit-log")({
  component: AuditLogPage,
})
