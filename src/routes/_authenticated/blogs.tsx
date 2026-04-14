import { createFileRoute } from "@tanstack/react-router"
import { BlogsPage } from "@/pages/content/blogs"

export const Route = createFileRoute("/_authenticated/blogs")({
  component: BlogsPage,
})
