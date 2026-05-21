import { http, HttpResponse } from "msw"

export const mockCompany = {
  id: "comp0001-0000-0000-0000-000000000001",
  name: "Acme Corp",
  taxId: "12-3456789",
  taxExempt: false,
  createdAt: "2026-01-05T00:00:00.000Z",
}

export const mockSpendingSummary = {
  totalOrders: 12,
  totalSpend: 8500.00,
  invoiceSummary: {
    pendingCount: 2,
    pendingAmount: 1200.00,
    overdueCount: 1,
    overdueAmount: 400.00,
    paidCount: 9,
    paidAmount: 6900.00,
  },
  memberSpending: [
    {
      userId: "user-0001-0000-0000-0000-000000000001",
      email: "alice@acme.com",
      totalSpend: 3200.00,
      spendingLimit: 5000.00,
      utilizationPercent: 64,
    },
  ],
}

export const companyHandlers = [
  http.get("http://localhost:8080/api/v1/companies", () =>
    HttpResponse.json({ data: [mockCompany] })
  ),
  http.get("http://localhost:8080/api/v1/admin/companies/:id/spending-summary", () =>
    HttpResponse.json({ data: mockSpendingSummary })
  ),
]
