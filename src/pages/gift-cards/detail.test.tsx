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
import { mockGiftCard, mockGiftCardTransaction } from "@/test/handlers/gift-cards"
import { GiftCardDetailPage } from "./detail"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function makeRouter(id = mockGiftCard.id) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gift-cards",
    validateSearch: () => ({}),
    component: () => <div>Gift Cards</div>,
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/gift-cards/$giftCardId",
    component: () => <GiftCardDetailPage id={id} />,
  })

  const routeTree = rootRoute.addChildren([listRoute, detailRoute])
  const history = createMemoryHistory({ initialEntries: [`/gift-cards/${id}`] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderDetail(id = mockGiftCard.id) {
  const { router, qc } = makeRouter(id)
  render(<RouterProvider router={router} />)
  return { router, qc }
}

describe("GiftCardDetailPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading skeleton before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/gift-cards/:id", () => new Promise(() => {}))
    )
    renderDetail()
    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
    })
  })

  it("shows 'Gift card not found' when API returns no data", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/gift-cards/:id", () =>
        HttpResponse.json({ data: null })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Gift card not found.")).toBeInTheDocument()
    })
  })

  it("renders gift card code as heading", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "GIFT-ABCD-1234" })).toBeInTheDocument()
    })
  })

  it("renders balance summary cards with correct values", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("$100.00")).toBeInTheDocument() // initial
    })
    expect(screen.getByText("$75.00")).toBeInTheDocument()  // current
    expect(screen.getByText("$25.00")).toBeInTheDocument()  // used = 100 - 75
  })

  it("renders transaction history with delta and note", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Order payment")).toBeInTheDocument()
    })
    expect(screen.getByText("-$25.00")).toBeInTheDocument()
  })

  it("active card shows Deactivate button", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Deactivate/i })).toBeInTheDocument()
    })
  })

  it("inactive card does not show Deactivate button", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/gift-cards/:id", () =>
        HttpResponse.json({ data: { ...mockGiftCard, isActive: false } })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "GIFT-ABCD-1234" })).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /Deactivate/i })).not.toBeInTheDocument()
  })

  it("Deactivate opens confirmation dialog and calls endpoint on confirm", async () => {
    let deactivateCalled = false
    server.use(
      http.put("http://localhost:8080/api/v1/admin/gift-cards/:id/deactivate", () => {
        deactivateCalled = true
        return HttpResponse.json({ data: { ...mockGiftCard, isActive: false } })
      })
    )
    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => expect(screen.getByRole("button", { name: /Deactivate/i })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /Deactivate/i }))
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Deactivate" }))
    await waitFor(() => expect(deactivateCalled).toBe(true))
  })

  it("Adjust balance button opens dialog with amount input", async () => {
    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => expect(screen.getByRole("button", { name: "Adjust balance" })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: "Adjust balance" }))
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("shows recipient email in metadata section", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("recipient@example.com")).toBeInTheDocument()
    })
  })

  it("order id is truncated in transaction row", async () => {
    renderDetail()
    await waitFor(() => {
      const orderId = mockGiftCardTransaction.orderId.slice(0, 8)
      expect(screen.getByText(`${orderId}…`)).toBeInTheDocument()
    })
  })
})
