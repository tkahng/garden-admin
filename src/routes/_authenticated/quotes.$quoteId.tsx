import { createFileRoute } from "@tanstack/react-router"
import { QuoteDetailPage } from "@/pages/quotes/detail"

export const Route = createFileRoute("/_authenticated/quotes/$quoteId")({
  component: function QuoteDetailRoute() {
    const { quoteId } = Route.useParams()
    return <QuoteDetailPage id={quoteId} />
  },
})
