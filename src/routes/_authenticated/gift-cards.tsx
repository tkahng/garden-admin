import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/gift-cards")({
  component: () => <Outlet />,
})
