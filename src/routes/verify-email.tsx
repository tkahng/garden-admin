import { createFileRoute } from "@tanstack/react-router"
import { VerifyEmailPage } from "@/pages/auth/verify-email"

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: function VerifyEmailRoute() {
    const { token } = Route.useSearch()
    return <VerifyEmailPage token={token} />
  },
})
