import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppLayout } from "@/components/layout/app-layout"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" })
    }
  },
  component: AppLayout,
})
