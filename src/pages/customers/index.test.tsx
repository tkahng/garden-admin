import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { mockCustomer } from "@/test/handlers/customers"
import { CustomersPage } from "./index"

function makeRouter(initialPath = "/customers") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
    component: () => <Outlet />,
  })

  const customersRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "customers",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      email: typeof search.email === "string" ? search.email : undefined,
    }),
    component: CustomersPage,
  })

  const customerDetailRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "customers/$customerId",
    component: () => <div>Customer Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([customersRoute, customerDetailRoute]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderCustomers(initialPath = "/customers") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("CustomersPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/users", () => new Promise(() => {}))
    )
    renderCustomers()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders customer rows with name, email and status", async () => {
    renderCustomers()
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    })
    expect(screen.getByText("jane@example.com")).toBeInTheDocument()
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
  })

  it("shows empty state when no customers returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/users", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderCustomers()
    await waitFor(() => {
      expect(screen.getByText(/No customers/)).toBeInTheDocument()
    })
  })

  it("customer name links to detail page", async () => {
    renderCustomers()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Jane Doe" })
      expect(link).toHaveAttribute("href", `/customers/${mockCustomer.id}`)
    })
  })

  it("SUSPENDED customer shows destructive badge", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/users", () =>
        HttpResponse.json({
          data: {
            content: [{ ...mockCustomer, status: "SUSPENDED" }],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      )
    )
    renderCustomers()
    await waitFor(() => {
      expect(screen.getByText("SUSPENDED")).toBeInTheDocument()
    })
  })

  it("typing in the search box updates the email param", async () => {
    const user = userEvent.setup()
    const router = renderCustomers()
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search by email...")).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText("Search by email..."), "jane")

    await waitFor(() => {
      const search = router.state.location.search as { email?: string }
      expect(search.email).toBe("jane")
    })
  })

  it("shows joined date column", async () => {
    renderCustomers()
    const expected = new Date("2026-01-15T10:00:00.000Z").toLocaleDateString()
    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })
})
