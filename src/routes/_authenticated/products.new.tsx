import { createFileRoute } from "@tanstack/react-router"
import { NewProductPage } from "@/pages/products/new"

export const Route = createFileRoute("/_authenticated/products/new")({
  component: NewProductPage,
})
