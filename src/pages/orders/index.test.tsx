import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
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
import { mockOrder } from "@/test/handlers/orders"
import { OrdersPage } from "./index"

function makeRouter(initialPath = "/orders") {
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

  const ordersRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "orders",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      status: typeof search.status === "string" ? search.status : undefined,
    }),
    component: OrdersPage,
  })

  const orderDetailRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "orders/$orderId",
    component: () => <div>Order Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([ordersRoute, orderDetailRoute]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderOrders(initialPath = "/orders") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

// Stable short ID display: first 8 chars of mockOrder.id uppercased
const ORDER_DISPLAY_ID = `#${mockOrder.id.slice(0, 8).toUpperCase()}`

describe("OrdersPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders", () => new Promise(() => {}))
    )
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders order row with id, payment badge, fulfillment badge and total", async () => {
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText(ORDER_DISPLAY_ID)).toBeInTheDocument()
    })
    // Scope to tbody to avoid matching the "Paid" status tab button
    const tbody = screen.getAllByRole("rowgroup")[1]
    expect(within(tbody).getByText("Paid")).toBeInTheDocument()
    expect(within(tbody).getByText("Unfulfilled")).toBeInTheDocument()
    expect(within(tbody).getByText("$109.98")).toBeInTheDocument()
  })

  it("renders order date", async () => {
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText(ORDER_DISPLAY_ID)).toBeInTheDocument()
    })
    const expectedDate = new Date("2026-04-01T10:00:00.000Z").toLocaleDateString()
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })

  it("order id links to detail page", async () => {
    renderOrders()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: ORDER_DISPLAY_ID })
      expect(link).toHaveAttribute("href", `/orders/${mockOrder.id}`)
    })
  })

  it("shows empty state when no orders returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText("No orders found")).toBeInTheDocument()
    })
  })

  it("cancelled order shows Cancelled badge in payment column only", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders", () =>
        HttpResponse.json({
          data: {
            content: [{ ...mockOrder, status: "CANCELLED" }],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      )
    )
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText("Cancelled")).toBeInTheDocument()
    })
    expect(screen.queryByText("Unfulfilled")).not.toBeInTheDocument()
  })

  it("pending payment order shows Pending badge", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders", () =>
        HttpResponse.json({
          data: {
            content: [{ ...mockOrder, status: "PENDING_PAYMENT" }],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      )
    )
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })
  })

  it("fulfilled order shows Fulfilled badge", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders", () =>
        HttpResponse.json({
          data: {
            content: [{ ...mockOrder, status: "FULFILLED" }],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      )
    )
    renderOrders()
    await waitFor(() => {
      expect(screen.getByText("Fulfilled")).toBeInTheDocument()
    })
  })

  it("clicking a status tab navigates with status search param", async () => {
    const user = userEvent.setup()
    const router = renderOrders()
    await waitFor(() => {
      expect(screen.getByText(ORDER_DISPLAY_ID)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Paid" }))

    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBe("PAID")
    })
  })

  it("clicking 'All' tab clears status filter", async () => {
    const user = userEvent.setup()
    const router = renderOrders("/orders?status=PAID")
    await waitFor(() => {
      expect(screen.getByText(ORDER_DISPLAY_ID)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "All" }))

    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBeUndefined()
    })
  })
})
