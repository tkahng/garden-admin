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
import { mockCollection } from "@/test/handlers/collections"
import { CollectionsPage } from "./index"

function makeRouter(initialPath = "/collections") {
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

  const collectionsLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "collections",
    component: () => <Outlet />,
  })

  const collectionsIndexRoute = createRoute({
    getParentRoute: () => collectionsLayoutRoute,
    path: "/",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      titleContains: typeof search.titleContains === "string" ? search.titleContains : undefined,
      collectionType: typeof search.collectionType === "string" ? search.collectionType : undefined,
    }),
    component: CollectionsPage,
  })

  const collectionDetailRoute = createRoute({
    getParentRoute: () => collectionsLayoutRoute,
    path: "$collectionId",
    component: () => <div>Collection Detail</div>,
  })

  const collectionsNewRoute = createRoute({
    getParentRoute: () => collectionsLayoutRoute,
    path: "new",
    component: () => <div>New Collection</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      collectionsLayoutRoute.addChildren([
        collectionsIndexRoute,
        collectionDetailRoute,
        collectionsNewRoute,
      ]),
    ]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderCollections(initialPath = "/collections") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("CollectionsPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/collections", () => new Promise(() => {}))
    )
    renderCollections()
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("renders collection row with title and type", async () => {
    renderCollections()
    await waitFor(() => {
      expect(screen.getByText(mockCollection.title)).toBeInTheDocument()
    })
    expect(screen.getAllByText("Manual").length).toBeGreaterThanOrEqual(1)
  })

  it("shows empty state when no collections returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/collections", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 20 } } })
      )
    )
    renderCollections()
    await waitFor(() => {
      expect(screen.getByText(/No collections yet/)).toBeInTheDocument()
    })
  })

  it("collection title links to detail page", async () => {
    renderCollections()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: mockCollection.title })
      expect(link).toHaveAttribute("href", `/collections/${mockCollection.id}`)
    })
  })

  it("clicking collection link navigates to detail page", async () => {
    const user = userEvent.setup()
    renderCollections()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: mockCollection.title })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("link", { name: mockCollection.title }))

    await waitFor(() => {
      expect(screen.getByText("Collection Detail")).toBeInTheDocument()
    })
    expect(screen.queryByText(mockCollection.title)).not.toBeInTheDocument()
  })
})
