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
import { mockQuote } from "@/test/handlers/quotes"
import { QuotesPage } from "./index"

function makeRouter(initialPath = "/quotes") {
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

  const quotesLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "quotes",
    component: () => <Outlet />,
  })

  const quotesIndexRoute = createRoute({
    getParentRoute: () => quotesLayoutRoute,
    path: "/",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      status: typeof search.status === "string" ? search.status : undefined,
    }),
    component: QuotesPage,
  })

  const quoteDetailRoute = createRoute({
    getParentRoute: () => quotesLayoutRoute,
    path: "$quoteId",
    component: () => <div>Quote Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      quotesLayoutRoute.addChildren([quotesIndexRoute, quoteDetailRoute]),
    ]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderQuotes(initialPath = "/quotes") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

const QUOTE_DISPLAY_ID = `#${mockQuote.id.slice(0, 8)}`

describe("QuotesPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/quotes", () => new Promise(() => {}))
    )
    renderQuotes()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders quote row with id and status badge", async () => {
    renderQuotes()
    await waitFor(() => {
      expect(screen.getByText(QUOTE_DISPLAY_ID)).toBeInTheDocument()
    })
    expect(screen.getByText("PENDING")).toBeInTheDocument()
  })

  it("shows empty state when no quotes returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/quotes", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderQuotes()
    await waitFor(() => {
      expect(screen.getByText("No quotes found")).toBeInTheDocument()
    })
  })

  it("quote id links to detail page", async () => {
    renderQuotes()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: QUOTE_DISPLAY_ID })
      expect(link).toHaveAttribute("href", `/quotes/${mockQuote.id}`)
    })
  })

  it("clicking quote link navigates to detail page", async () => {
    const user = userEvent.setup()
    renderQuotes()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: QUOTE_DISPLAY_ID })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("link", { name: QUOTE_DISPLAY_ID }))

    await waitFor(() => {
      expect(screen.getByText("Quote Detail")).toBeInTheDocument()
    })
    expect(screen.queryByText("Quotes")).not.toBeInTheDocument()
  })

  it("clicking a status tab navigates with status search param", async () => {
    const user = userEvent.setup()
    const router = renderQuotes()
    await waitFor(() => {
      expect(screen.getByText(QUOTE_DISPLAY_ID)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Pending" }))

    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBe("PENDING")
    })
  })
})
