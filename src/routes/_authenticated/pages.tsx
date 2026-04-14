import { createFileRoute } from "@tanstack/react-router"
import { PagesPage } from "@/pages/content/pages"

export const Route = createFileRoute("/_authenticated/pages")({
  component: PagesPage,
})
