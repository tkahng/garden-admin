import { http, HttpResponse } from "msw"

export const mockGiftCard = {
  id: "gc-001-0000-0000-0000-000000000001",
  code: "GIFT-ABCD-1234",
  initialBalance: 100,
  currentBalance: 75,
  currency: "USD",
  isActive: true,
  recipientEmail: "recipient@example.com",
  note: "Birthday gift",
  expiresAt: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  purchaserUserId: null,
}

export const mockGiftCardTransaction = {
  id: "tx-001",
  delta: -25,
  note: "Order payment",
  orderId: "order-00000000-0000-0000-0000-000000000001",
  createdAt: "2026-02-01T10:00:00.000Z",
}

export const giftCardHandlers = [
  http.get("http://localhost:8080/api/v1/admin/gift-cards", () =>
    HttpResponse.json({
      data: {
        content: [mockGiftCard],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),

  http.post("http://localhost:8080/api/v1/admin/gift-cards", () =>
    HttpResponse.json({ data: mockGiftCard })
  ),

  http.get("http://localhost:8080/api/v1/admin/gift-cards/:id", () =>
    HttpResponse.json({ data: mockGiftCard })
  ),

  http.get("http://localhost:8080/api/v1/admin/gift-cards/:id/transactions", () =>
    HttpResponse.json({ data: [mockGiftCardTransaction] })
  ),

  http.put("http://localhost:8080/api/v1/admin/gift-cards/:id", () =>
    HttpResponse.json({ data: mockGiftCard })
  ),

  http.put("http://localhost:8080/api/v1/admin/gift-cards/:id/deactivate", () =>
    HttpResponse.json({ data: { ...mockGiftCard, isActive: false } })
  ),

  http.post("http://localhost:8080/api/v1/admin/gift-cards/:id/transactions", () =>
    HttpResponse.json({ data: { id: "tx-002", delta: 10, note: "Adjustment", orderId: null, createdAt: "2026-04-01T10:00:00.000Z" } })
  ),
]
