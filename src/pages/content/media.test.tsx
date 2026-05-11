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
import { mockBlobInFolder } from "@/test/handlers/media"
import { MediaPage } from "./media"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function makeRouter(initialPath = "/media") {
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

  const mediaRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "media",
    validateSearch: (search: Record<string, unknown>) => ({
      page: search.page !== undefined ? Number(search.page) : undefined,
      contentType: typeof search.contentType === "string" ? search.contentType : undefined,
      q: typeof search.q === "string" ? search.q : undefined,
      folder: typeof search.folder === "string" ? search.folder : undefined,
      unorganized: search.unorganized === true || search.unorganized === "true" ? true : undefined,
    }),
    component: MediaPage,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([mediaRoute]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderMedia(initialPath = "/media") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("MediaPage — grid", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("renders blob filenames in the grid", async () => {
    renderMedia()
    await waitFor(() => {
      expect(screen.getByText("hero.jpg")).toBeInTheDocument()
      expect(screen.getByText("banner.jpg")).toBeInTheDocument()
    })
  })

  it("shows empty state when no files returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/blobs", () =>
        HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 24 } } })
      )
    )
    renderMedia()
    await waitFor(() => {
      expect(screen.getByText("No files found")).toBeInTheDocument()
    })
  })
})

describe("MediaPage — folder sidebar", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("renders All files, Unorganized, and named folder entries", async () => {
    renderMedia()
    await waitFor(() => {
      expect(screen.getByText("All files")).toBeInTheDocument()
      expect(screen.getByText("Unorganized")).toBeInTheDocument()
      expect(screen.getByText("products")).toBeInTheDocument()
    })
  })

  it("clicking a folder updates the URL search param", async () => {
    const user = userEvent.setup()
    const router = renderMedia()
    await waitFor(() => expect(screen.getByText("products")).toBeInTheDocument())

    await user.click(screen.getByText("products"))

    await waitFor(() => {
      const search = router.state.location.search as { folder?: string }
      expect(search.folder).toBe("products")
    })
  })

  it("clicking Unorganized sets unorganized param", async () => {
    const user = userEvent.setup()
    const router = renderMedia()
    await waitFor(() => expect(screen.getByText("Unorganized")).toBeInTheDocument())

    await user.click(screen.getByText("Unorganized"))

    await waitFor(() => {
      const search = router.state.location.search as { unorganized?: boolean }
      expect(search.unorganized).toBe(true)
    })
  })

  it("clicking All files clears folder and unorganized params", async () => {
    const user = userEvent.setup()
    const router = renderMedia("/media?folder=products")
    await waitFor(() => expect(screen.getByText("All files")).toBeInTheDocument())

    await user.click(screen.getByText("All files"))

    await waitFor(() => {
      const search = router.state.location.search as { folder?: string; unorganized?: boolean }
      expect(search.folder).toBeUndefined()
      expect(search.unorganized).toBeUndefined()
    })
  })

  it("active folder is highlighted in sidebar", async () => {
    renderMedia("/media?folder=products")
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /products/ })
      expect(btn.className).toMatch(/text-primary/)
    })
  })

  it("new folder input appears when + button clicked", async () => {
    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByTitle("New folder")).toBeInTheDocument())

    await user.click(screen.getByTitle("New folder"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Folder name…")).toBeInTheDocument()
    })
  })

  it("pressing Enter in new folder input navigates to that folder", async () => {
    const user = userEvent.setup()
    const router = renderMedia()
    await waitFor(() => expect(screen.getByTitle("New folder")).toBeInTheDocument())

    await user.click(screen.getByTitle("New folder"))
    await waitFor(() => expect(screen.getByPlaceholderText("Folder name…")).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText("Folder name…"), "seasonal{Enter}")

    await waitFor(() => {
      const search = router.state.location.search as { folder?: string }
      expect(search.folder).toBe("seasonal")
    })
  })
})

describe("MediaPage — folder filter passes to API", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("sends folder query param when folder is active", async () => {
    let capturedUrl: string | undefined
    server.use(
      http.get("http://localhost:8080/api/v1/admin/blobs", ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 24 } } })
      })
    )
    renderMedia("/media?folder=products")
    await waitFor(() => {
      expect(capturedUrl).toBeDefined()
      expect(capturedUrl).toContain("folder=products")
    })
  })

  it("sends unorganized=true when unorganized filter is active", async () => {
    let capturedUrl: string | undefined
    server.use(
      http.get("http://localhost:8080/api/v1/admin/blobs", ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ data: { content: [], meta: { total: 0, page: 0, size: 24 } } })
      })
    )
    renderMedia("/media?unorganized=true")
    await waitFor(() => {
      expect(capturedUrl).toBeDefined()
      expect(capturedUrl).toContain("unorganized=true")
    })
  })
})

describe("MediaPage — bulk selection and move", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("Move to folder button appears when files are selected", async () => {
    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByText("hero.jpg")).toBeInTheDocument())

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Move to folder/i })).toBeInTheDocument()
    })
  })

  it("Move to folder dialog opens and lists existing folders", async () => {
    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByText("hero.jpg")).toBeInTheDocument())

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])
    await waitFor(() => expect(screen.getByRole("button", { name: /Move to folder/i })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /Move to folder/i }))

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(within(screen.getByRole("dialog")).getByText("products")).toBeInTheDocument()
    })
  })

  it("selecting a folder in dialog and clicking Move calls the move endpoint", async () => {
    let moveCalled = false
    let moveBody: unknown
    server.use(
      http.post("http://localhost:8080/api/v1/admin/blobs/move", async ({ request }) => {
        moveCalled = true
        moveBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      })
    )

    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByText("hero.jpg")).toBeInTheDocument())

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])
    await waitFor(() => expect(screen.getByRole("button", { name: /Move to folder/i })).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /Move to folder/i }))

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument())
    const dialog = screen.getByRole("dialog")
    await user.click(within(dialog).getByText("products"))
    await user.click(within(dialog).getByRole("button", { name: "Move" }))

    await waitFor(() => {
      expect(moveCalled).toBe(true)
      expect((moveBody as { folder: string }).folder).toBe("products")
    })
  })

  it("bulk delete button appears when files are selected", async () => {
    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByText("hero.jpg")).toBeInTheDocument())

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument()
    })
  })
})

describe("MediaPage — detail panel", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("clicking a thumbnail opens the detail panel", async () => {
    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByText("hero.jpg")).toBeInTheDocument())

    await user.click(screen.getByText("hero.jpg").closest("div[class*=group]")!)

    await waitFor(() => {
      expect(screen.getByText("File details")).toBeInTheDocument()
    })
  })

  it("detail panel shows folder when blob has one", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/blobs", () =>
        HttpResponse.json({
          data: { content: [mockBlobInFolder], meta: { total: 1, page: 0, size: 24 } },
        })
      )
    )
    const user = userEvent.setup()
    renderMedia()
    await waitFor(() => expect(screen.getByText("banner.jpg")).toBeInTheDocument())

    await user.click(screen.getByText("banner.jpg").closest("div[class*=group]")!)

    await waitFor(() => {
      expect(screen.getByText("File details")).toBeInTheDocument()
    })
    // "products" appears in both the sidebar and the detail panel folder line
    expect(screen.getAllByText("products").length).toBeGreaterThanOrEqual(2)
  })
})
