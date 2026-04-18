import { http, HttpResponse } from "msw"

export const mockOrder = {
  id: "abc12345-6789-0000-0000-000000000001",
  status: "PAID",
  createdAt: "2026-04-01T10:00:00.000Z",
  userId: "user-9876",
  currency: "$",
  totalAmount: 109.98,
  notes: null,
  items: [
    {
      id: "item-1",
      quantity: 2,
      unitPrice: 49.99,
      product: { productTitle: "Classic Garden Chair", variantTitle: "Default", imageUrl: null },
    },
    {
      id: "item-2",
      quantity: 1,
      unitPrice: 9.99,
      product: { productTitle: "Garden Cushion", variantTitle: null, imageUrl: null },
    },
  ],
  shippingAddress: "John Doe\n123 Main St\nSpringfield, IL 62701\nUS",
}

export const orderHandlers = [
  http.get("http://localhost:8080/api/v1/admin/orders", () => {
    return HttpResponse.json({
      data: {
        content: [mockOrder],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  }),

  http.get("http://localhost:8080/api/v1/admin/orders/:id", () => {
    return HttpResponse.json({ data: mockOrder })
  }),

  http.get("http://localhost:8080/api/v1/admin/orders/:orderId/fulfillments", () => {
    return HttpResponse.json({ data: [] })
  }),

  http.get("http://localhost:8080/api/v1/admin/orders/:orderId/events", () => {
    return HttpResponse.json({ data: [] })
  }),

  http.put("http://localhost:8080/api/v1/admin/orders/:id/cancel", () => {
    return HttpResponse.json({ data: { ...mockOrder, status: "CANCELLED" } })
  }),

  http.post("http://localhost:8080/api/v1/admin/orders/:id/refund", () => {
    return HttpResponse.json({ data: { ...mockOrder, status: "REFUNDED" } })
  }),

  http.put("http://localhost:8080/api/v1/admin/orders/:id", () => {
    return HttpResponse.json({ data: mockOrder })
  }),

  http.post("http://localhost:8080/api/v1/admin/orders/:orderId/fulfillments", () => {
    return HttpResponse.json({ data: { id: "fulfillment-1", status: "FULFILLED" } })
  }),

  http.post("http://localhost:8080/api/v1/admin/orders/:orderId/events", () => {
    return HttpResponse.json({ data: { id: "event-1" } })
  }),
]
