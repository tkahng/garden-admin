import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
// inventory handler mock data used by MSW; imported to ensure test server registration
import "@/test/handlers/inventory"
import { InventoryPage } from "./index"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const VARIANT_ID = "aaaaaaaa-0000-0000-0000-000000000001"

const mockProductWithUuidVariant = {
  id: "pppp-0001",
  title: "Heirloom Tomato Seeds",
  handle: "heirloom-tomato-seeds",
  status: "ACTIVE",
  variants: [
    {
      id: VARIANT_ID,
      title: "Default",
      sku: "HTS-001",
      fulfillmentType: "IN_STOCK",
      inventoryPolicy: "DENY",
      leadTimeDays: 0,
    },
  ],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <InventoryPage />
    </QueryClientProvider>,
  )
  return qc
}

describe("InventoryPage — product/variant list", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", () =>
        HttpResponse.json({
          data: {
            content: [mockProductWithUuidVariant],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      ),
    )
    vi.clearAllMocks()
  })

  it("renders Inventory heading", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Inventory")).toBeInTheDocument())
  })

  it("renders a product row for each product returned", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Heirloom Tomato Seeds")).toBeInTheDocument())
  })

  it("shows product variant count chip", async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText("Heirloom Tomato Seeds")).toBeInTheDocument())
    // variant count badge "1"
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("expands product row and shows variant on click", async () => {
    renderPage()
    await waitFor(() => screen.getByText("Heirloom Tomato Seeds"))
    fireEvent.click(screen.getByText("Heirloom Tomato Seeds"))
    await waitFor(() => expect(screen.getByText("Default")).toBeInTheDocument())
    expect(screen.getByText("HTS-001")).toBeInTheDocument()
  })

  it("shows placeholder when no product selected", async () => {
    renderPage()
    await waitFor(() => screen.getByText("Heirloom Tomato Seeds"))
    expect(screen.getByText(/select a variant/i)).toBeInTheDocument()
  })

  it("filters products by search input", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get("q")
        if (q === "nomatch") {
          return HttpResponse.json({
            data: { content: [], meta: { total: 0, page: 0, size: 20 } },
          })
        }
        return HttpResponse.json({
          data: {
            content: [mockProductWithUuidVariant],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      }),
    )
    renderPage()
    await waitFor(() => screen.getByText("Heirloom Tomato Seeds"))
    const input = screen.getByPlaceholderText(/search products/i)
    await userEvent.clear(input)
    await userEvent.type(input, "nomatch")
    await waitFor(() =>
      expect(screen.queryByText("Heirloom Tomato Seeds")).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/no products found/i)).toBeInTheDocument()
  })
})

describe("InventoryPage — variant inventory panel", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/products", () =>
        HttpResponse.json({
          data: {
            content: [mockProductWithUuidVariant],
            meta: { total: 1, page: 0, size: 20 },
          },
        })
      ),
    )
    vi.clearAllMocks()
  })

  async function openVariantPanel() {
    renderPage()
    await waitFor(() => screen.getByText("Heirloom Tomato Seeds"))
    fireEvent.click(screen.getByText("Heirloom Tomato Seeds"))
    await waitFor(() => screen.getByText("Default"))
    fireEvent.click(screen.getByText("Default"))
  }

  it("shows stock levels for selected variant", async () => {
    await openVariantPanel()
    await waitFor(() => {
      const matches = screen.getAllByText("Main Warehouse")
      expect(matches.length).toBeGreaterThan(0)
    })
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("shows on hand / committed / available summary", async () => {
    await openVariantPanel()
    await waitFor(() => expect(screen.getByText(/42 on hand/i)).toBeInTheDocument())
    expect(screen.getByText(/5 committed/i)).toBeInTheDocument()
  })

  it("shows transaction history rows", async () => {
    await openVariantPanel()
    await waitFor(() => expect(screen.getByText("Initial stock")).toBeInTheDocument())
    expect(screen.getByText("RECEIVED")).toBeInTheDocument()
  })

  it("shows receive stock button", async () => {
    await openVariantPanel()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /receive/i })).toBeInTheDocument(),
    )
  })

  it("shows adjust stock button", async () => {
    await openVariantPanel()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /adjust/i })).toBeInTheDocument(),
    )
  })

  it("opens receive dialog when Receive is clicked", async () => {
    await openVariantPanel()
    const receiveBtn = await waitFor(() => screen.getAllByRole("button", { name: /receive/i })[0])
    fireEvent.click(receiveBtn)
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument(),
    )
    expect(screen.getByText("Receive stock")).toBeInTheDocument()
  })

  it("opens adjust dialog when Adjust is clicked", async () => {
    await openVariantPanel()
    await waitFor(() => screen.getByRole("button", { name: /adjust/i }))
    fireEvent.click(screen.getByRole("button", { name: /adjust/i }))
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument(),
    )
    expect(screen.getByText("Adjust stock")).toBeInTheDocument()
  })

  it("shows empty state when no stock levels returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/inventory/variants/:variantId/levels", () =>
        HttpResponse.json({ data: [] })
      ),
    )
    await openVariantPanel()
    await waitFor(() =>
      expect(screen.getByText(/no stock levels/i)).toBeInTheDocument(),
    )
  })

  it("shows fulfillment settings section", async () => {
    await openVariantPanel()
    await waitFor(() =>
      expect(screen.getByText(/fulfillment settings/i)).toBeInTheDocument(),
    )
  })
})
