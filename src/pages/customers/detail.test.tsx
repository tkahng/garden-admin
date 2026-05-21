import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
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
import { CustomerDetailPage } from "./detail"

const mockToastSuccess = vi.fn()
const mockToastInfo = vi.fn()
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: (...a: unknown[]) => mockToastSuccess(...a), info: (...a: unknown[]) => mockToastInfo(...a) } }))

function makeRouter(id = mockCustomer.id) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const customersListRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/customers",
    component: () => <div>Customers List</div>,
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/customers/$customerId",
    component: () => <CustomerDetailPage id={id} />,
  })

  const orderDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orders/$orderId",
    component: () => <div>Order Detail</div>,
  })

  const routeTree = rootRoute.addChildren([customersListRoute, detailRoute, orderDetailRoute])
  const history = createMemoryHistory({ initialEntries: [`/customers/${id}`] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderDetail(id = mockCustomer.id) {
  const { router, qc } = makeRouter(id)
  render(<RouterProvider router={router} />)
  return { router, qc }
}

describe("CustomerDetailPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/users/:id", () => new Promise(() => {}))
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders user name and email in the header", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Jane Doe" })).toBeInTheDocument()
    })
    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0)
  })

  it("ACTIVE user shows Suspend button and ACTIVE status badge", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Suspend" })).toBeInTheDocument()
    })
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
  })

  it("SUSPENDED user shows Reactivate button", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/users/:id", () =>
        HttpResponse.json({ data: { ...mockCustomer, status: "SUSPENDED" } })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reactivate" })).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument()
  })

  it("Suspend button calls suspend endpoint", async () => {
    let called = false
    server.use(
      http.put("http://localhost:8080/api/v1/admin/users/:id/suspend", () => {
        called = true
        return HttpResponse.json({ data: { ...mockCustomer, status: "SUSPENDED" } })
      })
    )
    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => expect(screen.getByRole("button", { name: "Suspend" })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: "Suspend" }))
    await waitFor(() => expect(called).toBe(true))
  })

  it("renders assigned role badges", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument()
    })
  })

  it("renders existing tags with remove buttons", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("vip")).toBeInTheDocument()
    })
    expect(screen.getByText("wholesale")).toBeInTheDocument()
  })

  it("adding a tag calls tags endpoint", async () => {
    let tagsCalled = false
    server.use(
      http.put("http://localhost:8080/api/v1/admin/users/:id/tags", () => {
        tagsCalled = true
        return HttpResponse.json({ data: { ...mockCustomer, tags: ["vip", "wholesale", "newbie"] } })
      })
    )
    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => expect(screen.getByPlaceholderText("Add tag...")).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText("Add tag..."), "newbie")
    await user.click(screen.getByRole("button", { name: "Add" }))
    await waitFor(() => expect(tagsCalled).toBe(true))
  })

  it("notes textarea is pre-populated with adminNotes", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByDisplayValue("Important customer")).toBeInTheDocument()
    })
  })

  it("editing notes shows Save and Discard buttons", async () => {
    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => expect(screen.getByDisplayValue("Important customer")).toBeInTheDocument())
    await user.type(screen.getByDisplayValue("Important customer"), " more")
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save notes" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument()
    })
  })

  // ─── OrderHistory section ──────────────────────────────────────────────────

  it("shows Order history section heading", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Order history")).toBeInTheDocument()
    })
  })

  it("renders order row with PAID status badge", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("PAID")).toBeInTheDocument()
    })
  })

  it("shows lifetime spend summary", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText(/1 order/)).toBeInTheDocument()
    })
  })

  it("shows 'No orders yet' when customer has no orders", async () => {
    const { http, HttpResponse } = await import("msw")
    server.use(
      http.get("http://localhost:8080/api/v1/admin/orders", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 50 } } })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("No orders yet.")).toBeInTheDocument()
    })
  })

  it("order ID links to order detail route using router Link (not bare anchor)", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("PAID")).toBeInTheDocument()
    })
    const orderId = "abc12345-6789-0000-0000-000000000001"
    const link = screen.getByRole("link", { name: `#${orderId.slice(0, 8).toUpperCase()}` })
    expect(link.tagName).toBe("A")
    expect(link.getAttribute("href")).toBe(`/orders/${orderId}`)
  })

  it("clicking order ID link navigates client-side to order detail", async () => {
    const user = userEvent.setup()
    const { router } = renderDetail()
    await waitFor(() => {
      expect(screen.getByText("PAID")).toBeInTheDocument()
    })
    const orderId = "abc12345-6789-0000-0000-000000000001"
    const link = screen.getByRole("link", { name: `#${orderId.slice(0, 8).toUpperCase()}` })
    await user.click(link)
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/orders/${orderId}`)
    })
  })
})

describe("CustomerDetailPage — impersonation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderDetail(id = mockCustomer.id) {
    const { router } = makeRouter(id)
    render(<RouterProvider router={router} />)
    return router
  }

  it("shows Impersonate button", async () => {
    renderDetail()
    await waitFor(() => expect(screen.getByTestId("impersonate-btn")).toBeInTheDocument())
  })

  it("calls impersonate endpoint and shows success or info toast", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const impersonateSpy = vi.fn()
    server.use(
      http.post("http://localhost:8080/api/v1/admin/users/:id/impersonate", async () => {
        impersonateSpy()
        return HttpResponse.json({
          data: {
            accessToken: "eyJhbGci.test",
            targetUserId: mockCustomer.id,
            targetEmail: mockCustomer.email,
            expiresAt: "2026-05-21T14:00:00.000Z",
          },
        })
      }),
    )
    renderDetail()
    await waitFor(() => screen.getByTestId("impersonate-btn"))
    fireEvent.click(screen.getByTestId("impersonate-btn"))
    await waitFor(() => expect(impersonateSpy).toHaveBeenCalled())
    await waitFor(() => {
      const called = mockToastSuccess.mock.calls.length > 0 || mockToastInfo.mock.calls.length > 0
      expect(called).toBe(true)
    })
  })
})
