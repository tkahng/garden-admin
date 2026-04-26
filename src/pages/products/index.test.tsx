import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
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
import { ProductsPage } from "./index"

function makeRouter(initialPath = "/products/") {
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

  const productsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "products/",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
      status: typeof search.status === "string" ? search.status : undefined,
    }),
    component: ProductsPage,
  })

  const productDetailRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "products/$productId",
    component: () => <div>Product Detail</div>,
  })

  const productsNewRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "products/new",
    component: () => <div>New Product</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([productsRoute, productDetailRoute, productsNewRoute]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderProducts(initialPath = "/products/") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("ProductsPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", () => new Promise(() => {}))
    )
    renderProducts()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders product rows with title, status, variants and price", async () => {
    renderProducts()
    await waitFor(() => {
      expect(screen.getByText("Classic Garden Chair")).toBeInTheDocument()
    })
    expect(screen.getByText("ACTIVE")).toBeInTheDocument()
    expect(screen.getByText("2 variants")).toBeInTheDocument()
    expect(screen.getByText("$49.99 – $59.99")).toBeInTheDocument()
  })

  it("shows vendor and product type columns", async () => {
    renderProducts()
    await waitFor(() => {
      expect(screen.getByText("Garden Co.")).toBeInTheDocument()
    })
    expect(screen.getByText("Furniture")).toBeInTheDocument()
  })

  it("shows empty state when no products returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderProducts()
    await waitFor(() => {
      expect(screen.getByText(/No products yet/)).toBeInTheDocument()
    })
  })

  it("clicking a status tab navigates with status search param", async () => {
    const user = userEvent.setup()
    const router = renderProducts()
    await waitFor(() => {
      expect(screen.getByText("Classic Garden Chair")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Active" }))

    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBe("ACTIVE")
    })
  })

  it("clicking 'All' tab clears the status filter", async () => {
    const user = userEvent.setup()
    const router = renderProducts("/products/?status=ACTIVE")
    await waitFor(() => {
      expect(screen.getByText("Classic Garden Chair")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "All" }))

    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBeUndefined()
    })
  })

  it("typing in the search box updates the titleContains param", async () => {
    const user = userEvent.setup()
    const router = renderProducts()
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search products...")).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText("Search products..."), "chair")

    await waitFor(() => {
      const search = router.state.location.search as { titleContains?: string }
      expect(search.titleContains).toBe("chair")
    })
  })

  it("renders Add product link", async () => {
    renderProducts()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Add product/ })).toBeInTheDocument()
    })
  })

  it("product title links to detail page", async () => {
    renderProducts()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Classic Garden Chair" })
      expect(link).toHaveAttribute("href", "/products/1")
    })
  })

  it("product title shows 'Untitled' when title is missing", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", () =>
        HttpResponse.json({
          data: {
            content: [{ ...mockProduct, title: null }],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      )
    )
    renderProducts()
    await waitFor(() => {
      expect(screen.getByText("Untitled")).toBeInTheDocument()
    })
  })

  it("shows '—' for price when product has no variants", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", () =>
        HttpResponse.json({
          data: {
            content: [{ ...mockProduct, variants: [] }],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      )
    )
    renderProducts()
    await waitFor(() => {
      const row = screen.getByRole("row", { name: /Classic Garden Chair/ })
      expect(within(row).getByText("—")).toBeInTheDocument()
    })
  })
})
