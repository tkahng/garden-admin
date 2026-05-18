import { http, HttpResponse } from "msw"

export const mockQuote = {
  id: "qt000001-0000-0000-0000-000000000001",
  status: "PENDING",
  userId: "user-aaaa-0000-0000-0000-000000000001",
  createdAt: "2026-03-10T09:00:00.000Z",
  updatedAt: "2026-03-10T09:00:00.000Z",
  staffNotes: "Handle with priority",
  companyId: "co000001-0000-0000-0000-000000000001",
  companyName: "Acme Corp",
  pdfBlobId: "blob-0001-0000-0000-0000-000000000001",
  items: [
    {
      id: "qi-0001",
      description: "Garden Hose 50ft",
      quantity: 2,
      unitPrice: 29.99,
    },
  ],
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

  http.get("http://localhost:8080/api/v1/admin/quotes/:id", () =>
    HttpResponse.json({ data: mockQuote })
  ),

  http.post("http://localhost:8080/api/v1/admin/quotes/:id/send", () =>
    HttpResponse.json({ data: { ...mockQuote, status: "SENT" } })
  ),

  http.post("http://localhost:8080/api/v1/admin/quotes/:id/assign", () =>
    HttpResponse.json({ data: { ...mockQuote, status: "ASSIGNED" } })
  ),

  http.post("http://localhost:8080/api/v1/admin/quotes/:id/cancel", () =>
    HttpResponse.json({ data: { ...mockQuote, status: "CANCELLED" } })
  ),

  http.put("http://localhost:8080/api/v1/admin/quotes/:id/notes", () =>
    HttpResponse.json({ data: mockQuote })
  ),

  http.post("http://localhost:8080/api/v1/admin/quotes/:id/items", () =>
    HttpResponse.json({ data: { id: "qi-0002", productTitle: "New Item", quantity: 1, unitPrice: 9.99 } })
  ),

  http.put("http://localhost:8080/api/v1/admin/quotes/:id/items/:itemId", () =>
    HttpResponse.json({ data: { ...mockQuote.items[0], quantity: 3 } })
  ),

  http.delete("http://localhost:8080/api/v1/admin/quotes/:id/items/:itemId", () =>
    HttpResponse.json({ data: {} })
  ),

  http.get("http://localhost:8080/api/v1/admin/quotes/:id/pdf", () =>
    new HttpResponse(new Uint8Array([37, 80, 68, 70]).buffer, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="quote.pdf"' },
    })
  ),
]
