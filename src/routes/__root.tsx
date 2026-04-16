import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import type { AuthContextValue } from "@/contexts/auth-context"

interface RouterContext {
  auth: AuthContextValue
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
