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
import { mockGiftCard } from "@/test/handlers/gift-cards"
import { GiftCardsPage } from "./index"

function makeRouter(initialPath = "/gift-cards") {
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

  const giftCardsLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "gift-cards",
    component: () => <Outlet />,
  })

  const giftCardsIndexRoute = createRoute({
    getParentRoute: () => giftCardsLayoutRoute,
    path: "/",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      codeContains: typeof search.codeContains === "string" ? search.codeContains : undefined,
    }),
    component: GiftCardsPage,
  })

  const giftCardDetailRoute = createRoute({
    getParentRoute: () => giftCardsLayoutRoute,
    path: "$giftCardId",
    component: () => <div>Gift Card Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      giftCardsLayoutRoute.addChildren([giftCardsIndexRoute, giftCardDetailRoute]),
    ]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderGiftCards(initialPath = "/gift-cards") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("GiftCardsPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/gift-cards", () => new Promise(() => {}))
    )
    renderGiftCards()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders gift card row with code", async () => {
    renderGiftCards()
    await waitFor(() => {
      expect(screen.getByText(mockGiftCard.code)).toBeInTheDocument()
    })
  })

  it("shows empty state when no gift cards returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/gift-cards", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderGiftCards()
    await waitFor(() => {
      expect(screen.getByText("No gift cards yet.")).toBeInTheDocument()
    })
  })

  it("gift card code links to detail page", async () => {
    renderGiftCards()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: mockGiftCard.code })
      expect(link).toHaveAttribute("href", `/gift-cards/${mockGiftCard.id}`)
    })
  })

  it("clicking gift card link navigates to detail page", async () => {
    const user = userEvent.setup()
    renderGiftCards()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: mockGiftCard.code })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("link", { name: mockGiftCard.code }))

    await waitFor(() => {
      expect(screen.getByText("Gift Card Detail")).toBeInTheDocument()
    })
    expect(screen.queryByText(mockGiftCard.code)).not.toBeInTheDocument()
  })
})
