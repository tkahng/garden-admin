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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { mockOrder } from "@/test/handlers/orders"
import { OrderDetailPage } from "./detail"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const ORDER_DISPLAY_ID = `#${mockOrder.id.slice(0, 8).toUpperCase()}`

function makeRouter(id = mockOrder.id) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const ordersListRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orders",
    component: () => <div>Orders List</div>,
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orders/$orderId",
    component: () => <OrderDetailPage id={id} />,
  })

  const routeTree = rootRoute.addChildren([ordersListRoute, detailRoute])
  const history = createMemoryHistory({ initialEntries: [`/orders/${id}`] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderDetail(id = mockOrder.id) {
  const { router, qc } = makeRouter(id)
  render(<RouterProvider router={router} />)
  return { router, qc }
}

describe("OrderDetailPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders/:id", () => new Promise(() => {}))
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("shows 'Order not found' when API returns no data", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders/:id", () =>
        HttpResponse.json({ data: null })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Order not found")).toBeInTheDocument()
    })
  })

  it("renders order id heading and status badge", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ORDER_DISPLAY_ID })).toBeInTheDocument()
    })
    // "Paid" may appear in status badge and summary — check at least one instance
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0)
  })

  it("renders all order items with product title, price, quantity and line total", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Classic Garden Chair")).toBeInTheDocument()
    })
    expect(screen.getByText("Garden Cushion")).toBeInTheDocument()
    expect(screen.getByText("$49.99")).toBeInTheDocument()
    // $9.99 appears twice: unit price + line total (qty 1)
    expect(screen.getAllByText("$9.99").length).toBeGreaterThanOrEqual(1)
    // quantities
    expect(screen.getByText("2")).toBeInTheDocument()
    // line total: 2 × $49.99 = $99.98
    expect(screen.getByText("$99.98")).toBeInTheDocument()
  })

  it("renders variant title when present", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Default")).toBeInTheDocument()
    })
  })

  it("shows shipping address", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    })
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument()
    expect(screen.getByText(/Springfield/)).toBeInTheDocument()
  })

  it("back button links to /orders", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ORDER_DISPLAY_ID })).toBeInTheDocument()
    })
    const backLink = screen.getByRole("link", { name: "" })
    expect(backLink).toHaveAttribute("href", "/orders")
  })

  it("PAID order shows Cancel, Refund and Fulfill buttons", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ORDER_DISPLAY_ID })).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Refund/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fulfill items" })).toBeInTheDocument()
  })

  it("CANCELLED order does not show Cancel, Refund or Fulfill buttons", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders/:id", () =>
        HttpResponse.json({ data: { ...mockOrder, status: "CANCELLED" } })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ORDER_DISPLAY_ID })).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Refund/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Fulfill items" })).not.toBeInTheDocument()
  })

  it("cancel button opens confirmation dialog then calls cancel endpoint", async () => {
    let cancelCalled = false
    server.use(
      http.put("http://localhost:8080/api/v1/admin/orders/:id/cancel", () => {
        cancelCalled = true
        return HttpResponse.json({ data: { ...mockOrder, status: "CANCELLED" } })
      })
    )

    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /Cancel/i }))
    expect(await screen.findByText("Cancel order?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel order" }))

    await waitFor(() => {
      expect(cancelCalled).toBe(true)
    })
  })

  it("refund button opens confirmation dialog then calls refund endpoint", async () => {
    let refundCalled = false
    server.use(
      http.post("http://localhost:8080/api/v1/admin/orders/:id/refund", () => {
        refundCalled = true
        return HttpResponse.json({ data: { ...mockOrder, status: "REFUNDED" } })
      })
    )

    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refund/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /Refund/i }))
    expect(await screen.findByText("Issue refund?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Issue refund" }))

    await waitFor(() => {
      expect(refundCalled).toBe(true)
    })
  })

  it("items count card shows correct item count", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Items (2)")).toBeInTheDocument()
    })
  })
})
