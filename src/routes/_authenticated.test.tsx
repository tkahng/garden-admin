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

function makeRouter(auth: AuthContextValue, initialPath = "/") {
  const rootRoute = createRootRouteWithContext<{ auth: AuthContextValue }>()({
    component: () => <Outlet />,
  })

  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
    beforeLoad: ({ context, location }) => {
      if (!context.auth.isAuthenticated) {
        throw redirect({
          to: "/login",
          search: { redirect_to: location.href },
        })
      }
    },
    component: () => <Outlet />,
  })

  const indexRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/",
    component: () => <div>Protected Dashboard</div>,
  })

  const productsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/products",
    component: () => <div>Protected Products</div>,
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: (search: Record<string, unknown>) => ({
      redirect_to: typeof search.redirect_to === "string" ? search.redirect_to : undefined,
    }),
    component: () => <div>Login Page</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([indexRoute, productsRoute]),
    loginRoute,
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })

  return createRouter({ routeTree, history, context: { auth } })
}

function renderRouter(auth: AuthContextValue, initialPath = "/") {
  const router = makeRouter(auth, initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("_authenticated route guard", () => {
  it("redirects unauthenticated user visiting / to /login", async () => {
    renderRouter(makeAuth(false), "/")
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument()
    })
    expect(screen.queryByText("Protected Dashboard")).not.toBeInTheDocument()
  })

  it("redirects unauthenticated user visiting /products to /login", async () => {
    renderRouter(makeAuth(false), "/products")
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument()
    })
    expect(screen.queryByText("Protected Products")).not.toBeInTheDocument()
  })

  it("preserves the original path in redirect_to search param", async () => {
    const router = renderRouter(makeAuth(false), "/products")
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument()
    })
    const search = router.state.location.search as { redirect_to?: string }
    expect(search.redirect_to).toBe("/products")
  })

  it("renders protected content for authenticated user", async () => {
    renderRouter(makeAuth(true), "/")
    await waitFor(() => {
      expect(screen.getByText("Protected Dashboard")).toBeInTheDocument()
    })
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument()
  })

  it("renders protected nested route for authenticated user", async () => {
    renderRouter(makeAuth(true), "/products")
    await waitFor(() => {
      expect(screen.getByText("Protected Products")).toBeInTheDocument()
    })
  })
})
