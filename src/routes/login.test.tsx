import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import {
  createRouter,
  createRootRouteWithContext,
  createRoute,
  RouterProvider,
  Outlet,
  redirect,
} from "@tanstack/react-router"
import { createMemoryHistory } from "@tanstack/react-router"
import type { AuthContextValue } from "@/contexts/auth-context"

function makeAuth(isAuthenticated: boolean): AuthContextValue {
  return {
    isAuthenticated,
    user: isAuthenticated ? { id: "1", email: "test@example.com" } : null,
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function makeRouter(auth: AuthContextValue, initialPath = "/login") {
  const rootRoute = createRootRouteWithContext<{ auth: AuthContextValue }>()({
    component: () => <Outlet />,
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: (search: Record<string, unknown>) => ({
      redirect_to: typeof search.redirect_to === "string" ? search.redirect_to : undefined,
    }),
    beforeLoad: ({ context, search }) => {
      if (context.auth.isAuthenticated) {
        throw redirect({ to: search.redirect_to ?? "/" })
      }
    },
    component: () => <div>Login Page</div>,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>Dashboard</div>,
  })

  const productsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/products",
    component: () => <div>Products</div>,
  })

  const routeTree = rootRoute.addChildren([loginRoute, indexRoute, productsRoute])
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return createRouter({ routeTree, history, context: { auth } })
}

describe("/login route beforeLoad", () => {
  it("unauthenticated user stays on login page", async () => {
    render(<RouterProvider router={makeRouter(makeAuth(false), "/login")} />)
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument()
    })
  })

  it("authenticated user is redirected to / when no redirect_to", async () => {
    render(<RouterProvider router={makeRouter(makeAuth(true), "/login")} />)
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument()
  })

  it("authenticated user is redirected to redirect_to path", async () => {
    render(<RouterProvider router={makeRouter(makeAuth(true), "/login?redirect_to=/products")} />)
    await waitFor(() => {
      expect(screen.getByText("Products")).toBeInTheDocument()
    })
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument()
  })
})
