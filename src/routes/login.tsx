import { createFileRoute, redirect } from "@tanstack/react-router"
import { LoginPage } from "@/pages/auth/login"

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_to: typeof search.redirect_to === "string" ? search.redirect_to : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect_to ?? "/" })
    }
  },
  component: LoginPage,
})
