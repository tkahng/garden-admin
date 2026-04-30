import { createFileRoute } from "@tanstack/react-router"
import { WebhooksPage } from "@/pages/webhooks"

export const Route = createFileRoute("/_authenticated/settings/webhooks")({
  component: WebhooksPage,
})
