import { createFileRoute } from "@tanstack/react-router"
import { CompanyDetailPage } from "@/pages/companies/detail"

export const Route = createFileRoute("/_authenticated/companies/$companyId")({
  component: function CompanyDetailRoute() {
    const { companyId } = Route.useParams()
    return <CompanyDetailPage id={companyId} />
  },
})
