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
import { mockBlog } from "@/test/handlers/blogs"
import { BlogsPage } from "./blogs"

function makeRouter(initialPath = "/blogs") {
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

  const blogsLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "blogs",
    component: () => <Outlet />,
  })

  const blogsIndexRoute = createRoute({
    getParentRoute: () => blogsLayoutRoute,
    path: "/",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
    }),
    component: BlogsPage,
  })

  const blogDetailRoute = createRoute({
    getParentRoute: () => blogsLayoutRoute,
    path: "$blogId",
    component: () => <div>Blog Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      blogsLayoutRoute.addChildren([blogsIndexRoute, blogDetailRoute]),
    ]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderBlogs(initialPath = "/blogs") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("BlogsPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/blogs", () => new Promise(() => {}))
    )
    renderBlogs()
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument()
    })
  })

  it("renders blog row with title and handle", async () => {
    renderBlogs()
    await waitFor(() => {
      expect(screen.getByText(mockBlog.title)).toBeInTheDocument()
    })
    expect(screen.getByText(mockBlog.handle)).toBeInTheDocument()
  })

  it("shows empty state when no blogs returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/blogs", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderBlogs()
    await waitFor(() => {
      expect(screen.getByText("No blogs yet.")).toBeInTheDocument()
    })
  })

  it("blog title links to detail page", async () => {
    renderBlogs()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: mockBlog.title })
      expect(link).toHaveAttribute("href", `/blogs/${mockBlog.id}`)
    })
  })

  it("clicking blog link navigates to detail page", async () => {
    const user = userEvent.setup()
    renderBlogs()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: mockBlog.title })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("link", { name: mockBlog.title }))

    await waitFor(() => {
      expect(screen.getByText("Blog Detail")).toBeInTheDocument()
    })
    expect(screen.queryByText(mockBlog.title)).not.toBeInTheDocument()
  })
})
