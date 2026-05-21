import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
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
import { mockReturn } from "@/test/handlers/returns"
import { ReturnsPage } from "./index"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function renderPage() {
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

  const ordersLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "orders",
    component: () => <Outlet />,
  })
  const orderDetailRoute = createRoute({
    getParentRoute: () => ordersLayoutRoute,
    path: "$orderId",
    component: () => <div>Order Detail</div>,
  })

  const returnsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "returns",
    component: () => <ReturnsPage />,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      ordersLayoutRoute.addChildren([orderDetailRoute]),
      returnsRoute,
    ]),
  ])
  const history = createMemoryHistory({ initialEntries: ["/returns"] })
  const router = createRouter({ routeTree, history, context: {} })
  render(<RouterProvider router={router} />)
  return qc
}

describe("ReturnsPage — list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Returns heading", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Returns")).toBeInTheDocument())
  })

  it("shows a row for each return request", async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(mockReturn.id.slice(0, 8) + "…")).toBeInTheDocument(),
    )
  })

  it("shows status badge", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument())
  })

  it("shows reason label", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Damaged")).toBeInTheDocument())
  })

  it("shows resolution label", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Refund")).toBeInTheDocument())
  })

  it("links to the order", async () => {
    renderPage()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: new RegExp(mockReturn.orderId!.slice(0, 8), "i") })
      expect(link).toBeInTheDocument()
    })
  })

  it("shows empty state when no returns", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/returns", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0 } } })
      ),
    )
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/no return requests/i)).toBeInTheDocument(),
    )
  })

  it("shows Approve and Reject buttons for PENDING returns", async () => {
    renderPage()
    await waitFor(() => screen.getByText("Pending"))
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument()
  })

  it("shows Complete button for APPROVED returns", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/returns", () =>
        HttpResponse.json({
          data: { content: [{ ...mockReturn, status: "APPROVED" }], meta: { total: 1 } },
        })
      ),
    )
    renderPage()
    await waitFor(() => expect(screen.getByText("Approved")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument()
  })
})

describe("ReturnsPage — approve/reject dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens approve dialog when Approve is clicked", async () => {
    renderPage()
    await waitFor(() => screen.getByRole("button", { name: "Approve" }))
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument())
    expect(screen.getByText("Approve return")).toBeInTheDocument()
  })

  it("opens reject dialog when Reject is clicked", async () => {
    renderPage()
    await waitFor(() => screen.getByRole("button", { name: "Reject" }))
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument())
    expect(screen.getByText("Reject return")).toBeInTheDocument()
  })

  it("calls approve endpoint and closes dialog on confirm", async () => {
    const approveSpy = vi.fn(() => Promise.resolve())
    server.use(
      http.post("http://localhost:8080/api/v1/admin/returns/:id/approve", async () => {
        approveSpy()
        return HttpResponse.json({ data: { ...mockReturn, status: "APPROVED" } })
      }),
    )
    renderPage()
    await waitFor(() => screen.getByRole("button", { name: "Approve" }))
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => screen.getByRole("dialog"))
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    await waitFor(() => expect(approveSpy).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("calls reject endpoint on confirm", async () => {
    const rejectSpy = vi.fn()
    server.use(
      http.post("http://localhost:8080/api/v1/admin/returns/:id/reject", async () => {
        rejectSpy()
        return HttpResponse.json({ data: { ...mockReturn, status: "REJECTED" } })
      }),
    )
    renderPage()
    await waitFor(() => screen.getByRole("button", { name: "Reject" }))
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    await waitFor(() => screen.getByRole("dialog"))
    // Click the Reject button inside the dialog
    const dialogRejectBtn = screen.getAllByRole("button", { name: "Reject" }).find(
      (b) => b.closest("[role=dialog]"),
    )!
    fireEvent.click(dialogRejectBtn)
    await waitFor(() => expect(rejectSpy).toHaveBeenCalled())
  })
})

describe("ReturnsPage — status filter", () => {
  it("renders status filter select", async () => {
    renderPage()
    await waitFor(() => screen.getByText("Returns"))
    expect(screen.getByText("All statuses")).toBeInTheDocument()
  })
})
