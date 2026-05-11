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
import { mockQuote } from "@/test/handlers/quotes"
import { QuoteDetailPage } from "./detail"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const QUOTE_DISPLAY_ID = `QUO-${mockQuote.id.slice(0, 8).toUpperCase()}`

function makeRouter(id = mockQuote.id) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const quotesLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/quotes",
    component: () => <Outlet />,
  })

  const quotesIndexRoute = createRoute({
    getParentRoute: () => quotesLayoutRoute,
    path: "/",
    component: () => <div>Quotes List</div>,
  })

  const detailRoute = createRoute({
    getParentRoute: () => quotesLayoutRoute,
    path: "$quoteId",
    component: () => <QuoteDetailPage id={id} />,
  })

  const routeTree = rootRoute.addChildren([
    quotesLayoutRoute.addChildren([quotesIndexRoute, detailRoute]),
  ])
  const history = createMemoryHistory({ initialEntries: [`/quotes/${id}`] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderDetail(id = mockQuote.id) {
  const { router, qc } = makeRouter(id)
  render(<RouterProvider router={router} />)
  return { router, qc }
}

describe("QuoteDetailPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/quotes/:id", () => new Promise(() => {}))
    )
    renderDetail()
    // Loading renders skeleton divs — heading not yet visible
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: QUOTE_DISPLAY_ID })).not.toBeInTheDocument()
    })
  })

  it("shows 'Quote not found' when API returns no data", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/quotes/:id", () =>
        HttpResponse.json({ data: null })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Quote not found.")).toBeInTheDocument()
    })
  })

  it("renders quote display ID heading", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
  })

  it("renders PENDING status badge", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("PENDING")).toBeInTheDocument()
    })
  })

  it("renders quote item with description and line total", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Garden Hose 50ft")).toBeInTheDocument()
    })
    // line total: 2 × $29.99 = $59.98 (appears in both row and summary)
    expect(screen.getAllByText("$59.98").length).toBeGreaterThan(0)
  })

  it("back link navigates to quotes list", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
    const backLinks = screen.getAllByRole("link")
    const quotesLink = backLinks.find((l) => l.getAttribute("href") === "/quotes")
    expect(quotesLink).toBeDefined()
  })

  it("PENDING quote shows Send and Assign buttons", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Assign/i })).toBeInTheDocument()
  })

  it("PENDING quote shows Cancel button", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
  })

  it("terminal quote (PAID) does not show Send, Assign or Cancel buttons", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/quotes/:id", () =>
        HttpResponse.json({ data: { ...mockQuote, status: "PAID" } })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /Send/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Assign/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeInTheDocument()
  })

  it("staff notes textarea is pre-populated", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByDisplayValue("Handle with priority")).toBeInTheDocument()
    })
  })

  it("renders the customer user ID (truncated)", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
    // userId truncated to 8 chars: "user-aaa" + ellipsis
    const truncated = mockQuote.userId.slice(0, 8)
    expect(screen.getByText(new RegExp(truncated))).toBeInTheDocument()
  })

  it("clicking back link navigates to quotes list", async () => {
    const user = userEvent.setup()
    const { router } = renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })
    const backLink = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/quotes")!
    await user.click(backLink)
    await waitFor(() => {
      expect(screen.getByText("Quotes List")).toBeInTheDocument()
    })
    expect(router.state.location.pathname).toMatch(/^\/quotes\/?$/)
  })
})
