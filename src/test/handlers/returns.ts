import { http, HttpResponse } from "msw"

export const mockReturn = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  orderId: "bbbbbbbb-0000-0000-0000-000000000002",
  userId: "cccccccc-0000-0000-0000-000000000003",
  reason: "DAMAGED",
  resolution: "REFUND",
  status: "PENDING",
  notes: "Item arrived cracked.",
  staffNotes: null,
  resolvedBy: null,
  resolvedAt: null,
  items: [],
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
}

export const returnHandlers = [
  http.get("http://localhost:8080/api/v1/admin/returns", () => {
    return HttpResponse.json({
      data: {
        content: [mockReturn],
        meta: { total: 1, page: 0, size: 100 },
      },
    })
  }),

  http.post("http://localhost:8080/api/v1/admin/returns/:id/approve", () => {
    return HttpResponse.json({ data: { ...mockReturn, status: "APPROVED" } })
  }),

  http.post("http://localhost:8080/api/v1/admin/returns/:id/reject", () => {
    return HttpResponse.json({ data: { ...mockReturn, status: "REJECTED" } })
  }),

  http.post("http://localhost:8080/api/v1/admin/returns/:id/complete", () => {
    return HttpResponse.json({ data: { ...mockReturn, status: "COMPLETED" } })
  }),
]
