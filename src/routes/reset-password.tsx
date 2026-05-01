import { createFileRoute, redirect } from "@tanstack/react-router"
import { ResetPasswordPage } from "@/pages/auth/reset-password"

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" })
    }
  },
  component: function ResetPasswordRoute() {
    const { token } = Route.useSearch()
    return <ResetPasswordPage token={token} />
  },
})
