import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
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
import { mockProduct } from "@/test/handlers/products"
import { ProductDetailPage } from "./detail"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function makeRouter(id = "1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const productsListRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/products",
    component: () => <div>Products List</div>,
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/products/$productId",
    component: () => <ProductDetailPage id={id} />,
  })

  const routeTree = rootRoute.addChildren([productsListRoute, detailRoute])
  const history = createMemoryHistory({ initialEntries: [`/products/${id}`] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderDetail(id = "1") {
  const { router, qc } = makeRouter(id)
  render(<RouterProvider router={router} />)
  return { router, qc }
}

describe("ProductDetailPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products/:id", () => new Promise(() => {}))
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("shows 'Product not found' when API returns no data", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products/:id", () =>
        HttpResponse.json({ data: null })
      )
    )
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Product not found")).toBeInTheDocument()
    })
  })

  it("renders product title, handle and status badge", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Classic Garden Chair" })).toBeInTheDocument()
    })
    // handle appears in header and detail card — both are correct
    expect(screen.getAllByText("classic-garden-chair").length).toBeGreaterThan(0)
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
  })

  it("renders product details: vendor, type, tags, description", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Garden Co.")).toBeInTheDocument()
    })
    expect(screen.getByText("Furniture")).toBeInTheDocument()
    expect(screen.getByText("outdoor")).toBeInTheDocument()
    expect(screen.getByText("seating")).toBeInTheDocument()
    expect(screen.getByText("A sturdy outdoor chair.")).toBeInTheDocument()
  })

  it("renders both variants in the variants table", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("Default")).toBeInTheDocument()
    })
    expect(screen.getByText("Large")).toBeInTheDocument()
    expect(screen.getByText("CGC-001")).toBeInTheDocument()
    expect(screen.getByText("CGC-002")).toBeInTheDocument()
  })

  it("renders variant prices", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("$49.99")).toBeInTheDocument()
    })
    expect(screen.getByText("$59.99")).toBeInTheDocument()
  })

  it("back button links to /products", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Classic Garden Chair" })).toBeInTheDocument()
    })
    const backLink = screen.getByRole("link", { name: "" })
    expect(backLink).toHaveAttribute("href", "/products")
  })

  it("status select renders with current product status as value", async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })
    // Status options are capitalized: ACTIVE → "Active"
    expect(screen.getByRole("combobox")).toHaveTextContent("Active")
  })

  it("status mutation patches the status endpoint on change", async () => {
    let patchedStatus: string | undefined
    server.use(
      http.patch("http://localhost:8080/api/v1/admin/products/:id/status", async ({ request }) => {
        const body = await request.json() as { status?: string }
        patchedStatus = body.status
        return HttpResponse.json({ data: { ...mockProduct, status: "DRAFT" } })
      })
    )

    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("combobox"))
    // Status options are capitalized: "Draft", "Active", "Archived"
    const draftOption = await screen.findByRole("option", { name: "Draft" })
    await user.click(draftOption)

    await waitFor(() => {
      expect(patchedStatus).toBe("DRAFT")
    })
  })

  it("renders product image thumbnail", async () => {
    renderDetail()
    await waitFor(() => {
      const img = screen.getByRole("img", { name: "Chair" })
      expect(img).toHaveAttribute("src", "https://example.com/chair.jpg")
    })
  })

  it("delete variant opens confirmation dialog then calls DELETE", async () => {
    let deleteWasCalled = false
    server.use(
      http.delete(
        "http://localhost:8080/api/v1/admin/products/:id/variants/:vId",
        () => {
          deleteWasCalled = true
          return new HttpResponse(null, { status: 204 })
        }
      )
    )

    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText("CGC-001")).toBeInTheDocument()
    })

    // Click the trash icon on the first variant row
    const variantRows = screen.getAllByRole("row").filter((r) =>
      within(r).queryByText("CGC-001")
    )
    const trashBtn = within(variantRows[0]).getAllByRole("button").at(-1)!
    await user.click(trashBtn)

    // Confirm in the AlertDialog
    const confirmBtn = await screen.findByRole("button", { name: /delete/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(deleteWasCalled).toBe(true)
    })
  })
})
