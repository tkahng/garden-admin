import { createFileRoute, redirect } from "@tanstack/react-router"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password"

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" })
    }
  },
  component: ForgotPasswordPage,
})
