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
import { mockPage } from "@/test/handlers/pages"
import { PagesPage } from "./pages"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function makeRouter(initialPath = "/pages") {
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

  const pagesRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "pages",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
      status: typeof search.status === "string" ? search.status : undefined,
    }),
    component: PagesPage,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([pagesRoute]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderPages(initialPath = "/pages") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("PagesPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/pages", () => new Promise(() => {}))
    )
    renderPages()
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument()
    })
  })

  it("renders page rows with title, handle and status", async () => {
    renderPages()
    await waitFor(() => {
      expect(screen.getByText("About Us")).toBeInTheDocument()
    })
    expect(screen.getByText("about-us")).toBeInTheDocument()
    // "Published" appears in both the status tab and the row badge
    expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(2)
  })

  it("shows empty state when no pages returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/pages", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderPages()
    await waitFor(() => {
      expect(screen.getByText("No pages yet.")).toBeInTheDocument()
    })
  })

  it("Draft page shows Draft badge", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/pages", () =>
        HttpResponse.json({
          data: { content: [{ ...mockPage, status: "DRAFT" }], meta: { total: 1, page: 0, size: 20 } },
        })
      )
    )
    renderPages()
    await waitFor(() => {
      expect(screen.getByText("Draft")).toBeInTheDocument()
    })
  })

  it("clicking status badge in row calls toggle endpoint", async () => {
    let statusCalled = false
    server.use(
      http.patch("http://localhost:8080/api/v1/admin/pages/:id/status", () => {
        statusCalled = true
        return HttpResponse.json({ data: { ...mockPage, status: "DRAFT" } })
      })
    )
    const user = userEvent.setup()
    renderPages()
    await waitFor(() => expect(screen.getByText("About Us")).toBeInTheDocument())
    // Find the badge inside the table row (not the tab button)
    const row = screen.getByRole("row", { name: /About Us/ })
    const badge = row.querySelector("[class*=badge], span[class*=cursor-pointer]") ??
      Array.from(row.querySelectorAll("span")).find((el) => el.textContent?.includes("Published"))
    await user.click(badge!)
    await waitFor(() => expect(statusCalled).toBe(true))
  })

  it("New page button opens dialog with title input", async () => {
    const user = userEvent.setup()
    renderPages()
    await waitFor(() => expect(screen.getByRole("button", { name: /New page/i })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /New page/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("About us")).toBeInTheDocument()
    })
  })

  it("create dialog calls POST and closes on success", async () => {
    let createCalled = false
    server.use(
      http.post("http://localhost:8080/api/v1/admin/pages", () => {
        createCalled = true
        return HttpResponse.json({ data: mockPage })
      })
    )
    const user = userEvent.setup()
    renderPages()
    await waitFor(() => expect(screen.getByRole("button", { name: /New page/i })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /New page/i }))
    await waitFor(() => expect(screen.getByPlaceholderText("About us")).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText("About us"), "New Page Title")
    await user.click(screen.getByRole("button", { name: "Create" }))
    await waitFor(() => expect(createCalled).toBe(true))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("delete icon opens confirmation dialog", async () => {
    const user = userEvent.setup()
    renderPages()
    await waitFor(() => expect(screen.getByText("About Us")).toBeInTheDocument())
    const row = screen.getByRole("row", { name: /About Us/ })
    await user.hover(row)
    const deleteBtn = row.querySelector("[aria-label]") ?? row.querySelectorAll("button")[1]
    await user.click(deleteBtn)
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })
  })

  it("status tabs navigate with status search param", async () => {
    const user = userEvent.setup()
    const router = renderPages()
    await waitFor(() => expect(screen.getByText("About Us")).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: "Published" }))
    await waitFor(() => {
      const search = router.state.location.search as { status?: string }
      expect(search.status).toBe("PUBLISHED")
    })
  })
})
