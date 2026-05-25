import { http, HttpResponse } from "msw"

export const mockCompany = {
  id: "comp0001-0000-0000-0000-000000000001",
  name: "Acme Corp",
  taxId: "12-3456789",
  taxExempt: false,
  createdAt: "2026-01-05T00:00:00.000Z",
}

export const mockApprovalRule = {
  id: "rule-0001-0000-0000-0000-000000000001",
  companyId: mockCompany.id,
  name: "Manager approval",
  thresholdAmount: 500,
  requiredRole: "MANAGER",
  active: true,
  createdAt: "2026-05-01T10:00:00.000Z",
}

export const mockDepartment = {
  id: "dept-0001-0000-0000-0000-000000000001",
  companyId: mockCompany.id,
  parentId: null,
  name: "Engineering",
  children: [],
  createdAt: "2026-05-01T10:00:00.000Z",
}

export const mockImpersonateResponse = {
  accessToken: "eyJhbGciOiJSUzI1NiJ9.test-token",
  targetUserId: "user-0001-0000-0000-0000-000000000001",
  targetEmail: "alice@acme.com",
  expiresAt: "2026-05-21T14:00:00.000Z",
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
  http.get("http://localhost:8080/api/v1/admin/companies/:companyId/approval-rules", () =>
    HttpResponse.json({ data: [mockApprovalRule] })
  ),
  http.post("http://localhost:8080/api/v1/admin/companies/:companyId/approval-rules", () =>
    HttpResponse.json({ data: mockApprovalRule })
  ),
  http.put("http://localhost:8080/api/v1/admin/companies/:companyId/approval-rules/:ruleId", () =>
    HttpResponse.json({ data: mockApprovalRule })
  ),
  http.delete("http://localhost:8080/api/v1/admin/companies/:companyId/approval-rules/:ruleId", () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.patch("http://localhost:8080/api/v1/admin/companies/:companyId/approval-rules/:ruleId/toggle", () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.get("http://localhost:8080/api/v1/admin/companies/:companyId/departments", () =>
    HttpResponse.json({ data: [mockDepartment] })
  ),
  http.post("http://localhost:8080/api/v1/admin/companies/:companyId/departments", () =>
    HttpResponse.json({ data: mockDepartment })
  ),
  http.put("http://localhost:8080/api/v1/admin/companies/:companyId/departments/:deptId", () =>
    HttpResponse.json({ data: mockDepartment })
  ),
  http.delete("http://localhost:8080/api/v1/admin/companies/:companyId/departments/:deptId", () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.put("http://localhost:8080/api/v1/admin/companies/:companyId/departments/members/:userId/department", () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.post("http://localhost:8080/api/v1/admin/users/:id/impersonate", () =>
    HttpResponse.json({ data: mockImpersonateResponse })
  ),
]
