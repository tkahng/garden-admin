import { createFileRoute, redirect } from "@tanstack/react-router"
import { LoginPage } from "@/pages/auth/login"

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" })
    }
  },
  component: LoginPage,
})
