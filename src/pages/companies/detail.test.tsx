import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { mockSpendingSummary } from "@/test/handlers/companies"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// Test the SpendingSummarySection in isolation via the full CompanyDetailPage
// The detail page needs many handlers — we stub the heavy ones to avoid noise.
import { SpendingSummarySection } from "./detail"

function renderSection(companyId = "comp-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <SpendingSummarySection companyId={companyId} />
    </QueryClientProvider>,
  )
}

describe("SpendingSummarySection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Spending heading", async () => {
    renderSection()
    expect(screen.getByRole("heading", { level: 2, name: /spending/i }) ||
      screen.getByText("Spending")).toBeInTheDocument()
  })

  it("shows total orders and spend", async () => {
    renderSection()
    await waitFor(() =>
      expect(screen.getByText("12")).toBeInTheDocument(),
    )
    expect(screen.getByText("$8,500")).toBeInTheDocument()
  })

  it("shows invoice aging with pending, overdue, paid totals", async () => {
    renderSection()
    await waitFor(() => screen.getByText("Overdue"))
    expect(screen.getByText("Pending")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
    expect(screen.getByText("$1,200")).toBeInTheDocument()
    expect(screen.getByText("$400")).toBeInTheDocument()
    expect(screen.getByText("$6,900")).toBeInTheDocument()
  })

  it("shows member spending with email and utilization", async () => {
    renderSection()
    await waitFor(() => expect(screen.getByText("alice@acme.com")).toBeInTheDocument())
    expect(screen.getByText(/64%/)).toBeInTheDocument()
  })

  it("shows empty state when API returns no data", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/companies/:id/spending-summary", () =>
        HttpResponse.json({ data: null })
      ),
    )
    renderSection("comp-empty")
    await waitFor(() =>
      expect(screen.getByText(/no spending data/i)).toBeInTheDocument(),
    )
  })

  it("shows zero invoices when no invoice data present", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/companies/:id/spending-summary", () =>
        HttpResponse.json({
          data: {
            ...mockSpendingSummary,
            invoiceSummary: {
              pendingCount: 0, pendingAmount: 0,
              overdueCount: 0, overdueAmount: 0,
              paidCount: 0, paidAmount: 0,
            },
            memberSpending: [],
          },
        })
      ),
    )
    renderSection("comp-empty2")
    await waitFor(() => {
      const zeros = screen.getAllByText("0 invoices")
      expect(zeros.length).toBe(3) // pending, overdue, paid all zero
    })
    expect(screen.getByText("Pending")).toBeInTheDocument()
  })
})
