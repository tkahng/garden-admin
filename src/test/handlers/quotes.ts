import { http, HttpResponse } from "msw"

export const mockQuote = {
  id: "qt000001-0000-0000-0000-000000000001",
  status: "PENDING",
  userId: "user-aaaa-0000-0000-0000-000000000001",
  createdAt: "2026-03-10T09:00:00.000Z",
}

export const quoteHandlers = [
  http.get("http://localhost:8080/api/v1/admin/quotes", () =>
    HttpResponse.json({
      data: {
        content: [mockQuote],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),
]
