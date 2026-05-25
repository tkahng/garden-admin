import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { mockSpendingSummary } from "@/test/handlers/companies"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

// Test sections in isolation
import { SpendingSummarySection } from "./detail"

// We need to also export these for testing
import { ApprovalRulesSection, DepartmentsSection } from "./detail"

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

// ─── ApprovalRulesSection ────────────────────────────────────────────────────

function renderApprovalRules(companyId = "comp-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <ApprovalRulesSection companyId={companyId} />
    </QueryClientProvider>,
  )
}

describe("ApprovalRulesSection", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders Approval rules heading", async () => {
    renderApprovalRules()
    expect(screen.getByText("Approval rules")).toBeInTheDocument()
  })

  it("shows rule name, threshold and role", async () => {
    renderApprovalRules()
    await waitFor(() => expect(screen.getByText("Manager approval")).toBeInTheDocument())
    // threshold cell contains formatted amount + "+"
    const thresholdCell = screen.getByText(/\$500/)
    expect(thresholdCell.closest("td")).toHaveTextContent(/\$500.*\+/)
    expect(screen.getByText("Manager+")).toBeInTheDocument()
  })

  it("shows empty state when no rules", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/companies/:companyId/approval-rules", () =>
        HttpResponse.json({ data: [] })
      ),
    )
    renderApprovalRules("comp-empty-rules")
    await waitFor(() =>
      expect(screen.getByText(/no approval rules configured/i)).toBeInTheDocument(),
    )
  })

  it("shows Add rule button", async () => {
    renderApprovalRules()
    expect(screen.getByRole("button", { name: /add rule/i })).toBeInTheDocument()
  })

  it("opens create form when Add rule is clicked", async () => {
    renderApprovalRules()
    fireEvent.click(screen.getByRole("button", { name: /add rule/i }))
    await waitFor(() => expect(screen.getByText("New approval rule")).toBeInTheDocument())
    expect(screen.getByPlaceholderText("Manager approval")).toBeInTheDocument()
  })
})

// ─── DepartmentsSection ──────────────────────────────────────────────────────

function renderDepartments(companyId = "comp-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <DepartmentsSection companyId={companyId} />
    </QueryClientProvider>,
  )
}

describe("DepartmentsSection", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders Departments heading", async () => {
    renderDepartments()
    expect(screen.getByText("Departments")).toBeInTheDocument()
  })

  it("shows department name from API", async () => {
    renderDepartments()
    await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument())
  })

  it("shows empty state when no departments", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/companies/:companyId/departments", () =>
        HttpResponse.json({ data: [] })
      ),
    )
    renderDepartments("comp-nodepts")
    await waitFor(() =>
      expect(screen.getByText(/no departments configured/i)).toBeInTheDocument(),
    )
  })

  it("shows Add department button", async () => {
    renderDepartments()
    expect(screen.getByRole("button", { name: /add department/i })).toBeInTheDocument()
  })

  it("opens create form when Add department is clicked", async () => {
    renderDepartments()
    fireEvent.click(screen.getByRole("button", { name: /add department/i }))
    await waitFor(() => expect(screen.getByText("New department")).toBeInTheDocument())
    expect(screen.getByPlaceholderText("Engineering")).toBeInTheDocument()
  })
})
