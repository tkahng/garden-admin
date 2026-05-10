import { http, HttpResponse } from "msw"

export const mockInvoice = {
  id: "inv00001-0000-0000-0000-000000000001",
  status: "ISSUED",
  companyId: "comp0001-0000-0000-0000-000000000001",
  totalAmount: 5000,
  paidAmount: 0,
  currency: "USD",
  issuedAt: "2026-03-01T00:00:00.000Z",
  dueAt: "2026-03-31T00:00:00.000Z",
}

export const invoiceHandlers = [
  http.get("http://localhost:8080/api/v1/admin/invoices", () =>
    HttpResponse.json({
      data: {
        content: [mockInvoice],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),
]
