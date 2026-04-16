import { createFileRoute } from "@tanstack/react-router"
import { CompaniesPage } from "@/pages/companies"

export const Route = createFileRoute("/_authenticated/companies")({
  component: CompaniesPage,
})
