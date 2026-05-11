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
import { mockInvoice } from "@/test/handlers/invoices"
import { InvoicesPage } from "./index"

function makeRouter(initialPath = "/invoices") {
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

  const invoicesLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "invoices",
    component: () => <Outlet />,
  })

  const invoicesIndexRoute = createRoute({
    getParentRoute: () => invoicesLayoutRoute,
    path: "/",
    validateSearch: (s: Record<string, unknown>) => ({
      page: s.page !== undefined ? Number(s.page) : undefined,
      status: typeof s.status === "string" ? s.status : undefined,
      companyId: typeof s.companyId === "string" ? s.companyId : undefined,
    }),
    component: InvoicesPage,
  })

  const invoiceDetailRoute = createRoute({
    getParentRoute: () => invoicesLayoutRoute,
    path: "$invoiceId",
    component: () => <div>Invoice Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      invoicesLayoutRoute.addChildren([invoicesIndexRoute, invoiceDetailRoute]),
    ]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderInvoices(initialPath = "/invoices") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

const INVOICE_LINK_TEXT = `${mockInvoice.id.slice(0, 8)}…`

describe("InvoicesPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/invoices", () => new Promise(() => {}))
    )
    renderInvoices()
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument()
    })
  })

  it("renders invoice row with id and status badge", async () => {
    renderInvoices()
    await waitFor(() => {
      expect(screen.getByText(INVOICE_LINK_TEXT)).toBeInTheDocument()
    })
    expect(screen.getByText("issued")).toBeInTheDocument()
  })

  it("shows empty state when no invoices returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/invoices", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderInvoices()
    await waitFor(() => {
      expect(screen.getByText("No invoices found.")).toBeInTheDocument()
    })
  })

  it("invoice id links to detail page", async () => {
    renderInvoices()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: INVOICE_LINK_TEXT })
      expect(link).toHaveAttribute("href", `/invoices/${mockInvoice.id}`)
    })
  })

  it("clicking invoice link navigates to detail page", async () => {
    const user = userEvent.setup()
    renderInvoices()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: INVOICE_LINK_TEXT })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("link", { name: INVOICE_LINK_TEXT }))

    await waitFor(() => {
      expect(screen.getByText("Invoice Detail")).toBeInTheDocument()
    })
    expect(screen.queryByText("Invoices")).not.toBeInTheDocument()
  })

  it("clicking a status tab navigates with status search param", async () => {
    const user = userEvent.setup()
    const router = renderInvoices()
    await waitFor(() => {
      expect(screen.getByText(INVOICE_LINK_TEXT)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Overdue" }))

    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBe("OVERDUE")
    })
  })
})
