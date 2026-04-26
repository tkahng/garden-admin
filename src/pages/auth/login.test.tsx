import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  createRouter,
  createRootRouteWithContext,
  createRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router"
import { createMemoryHistory } from "@tanstack/react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { AuthProvider } from "@/contexts/auth-context"
import { LoginPage } from "./login"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

import { toast } from "sonner"

function makeRouter(initialPath = "/login") {
  const rootRoute = createRootRouteWithContext<object>()({
    component: () => <Outlet />,
  })

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: (search: Record<string, unknown>) => ({
      redirect_to: typeof search.redirect_to === "string" ? search.redirect_to : undefined,
    }),
    component: LoginPage,
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
  return createRouter({ routeTree, history, context: {} })
}

function renderLogin(initialPath = "/login") {
  const router = makeRouter(initialPath)
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
  return router
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("renders email, password fields and submit button", async () => {
    renderLogin()
    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument()
    })
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })

  it("shows loading state while submitting", async () => {
    server.use(
      http.post("http://localhost:8080/api/v1/auth/login", () => new Promise(() => {}))
    )
    const user = userEvent.setup()
    renderLogin()
    await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument())

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "password")
    user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled()
    })
  })

  it("navigates to / after successful login with no redirect_to", async () => {
    const user = userEvent.setup()
    const router = renderLogin()
    await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument())

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe("/")
  })

  it("navigates to redirect_to after successful login", async () => {
    const user = userEvent.setup()
    const router = renderLogin("/login?redirect_to=/products")
    await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument())

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => {
      expect(screen.getByText("Products")).toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe("/products")
  })

  it("shows error toast on failed login", async () => {
    server.use(
      http.post("http://localhost:8080/api/v1/auth/login", () =>
        HttpResponse.json({}, { status: 401 })
      )
    )
    const user = userEvent.setup()
    renderLogin()
    await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument())

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid email or password")
    })
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })

  it("re-enables submit button after failed login", async () => {
    server.use(
      http.post("http://localhost:8080/api/v1/auth/login", () =>
        HttpResponse.json({}, { status: 401 })
      )
    )
    const user = userEvent.setup()
    renderLogin()
    await waitFor(() => expect(screen.getByLabelText("Email")).toBeInTheDocument())

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).not.toBeDisabled()
    })
  })
})
