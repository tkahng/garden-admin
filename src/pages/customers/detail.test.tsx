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
import { mockCustomer } from "@/test/handlers/customers"
import { CustomerDetailPage } from "./detail"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

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

  const routeTree = rootRoute.addChildren([customersListRoute, detailRoute])
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
})
