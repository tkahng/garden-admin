import { http, HttpResponse } from "msw"

export const mockLocation = {
  id: "loc-1",
  name: "Main Warehouse",
  isActive: true,
}

export const mockInventoryLevel = {
  id: "lvl-1",
  locationId: "loc-1",
  locationName: "Main Warehouse",
  quantityOnHand: 42,
  quantityCommitted: 5,
}

export const mockTransaction = {
  id: "tx-1",
  locationId: "loc-1",
  locationName: "Main Warehouse",
  quantity: 10,
  reason: "RECEIVED",
  note: "Initial stock",
  createdAt: "2026-05-01T10:00:00.000Z",
}

export const inventoryHandlers = [
  http.get("http://localhost:8080/api/v1/admin/locations", () => {
    return HttpResponse.json({ data: [mockLocation] })
  }),

  http.get("http://localhost:8080/api/v1/admin/inventory/variants/:variantId/levels", () => {
    return HttpResponse.json({ data: [mockInventoryLevel] })
  }),

  http.get("http://localhost:8080/api/v1/admin/inventory/variants/:variantId/transactions", () => {
    return HttpResponse.json({
      data: {
        content: [mockTransaction],
        meta: { total: 1, page: 0, size: 15 },
      },
    })
  }),

  http.post("http://localhost:8080/api/v1/admin/inventory/variants/:variantId/receive", () => {
    return HttpResponse.json({ data: { success: true } })
  }),

  http.post("http://localhost:8080/api/v1/admin/inventory/variants/:variantId/adjust", () => {
    return HttpResponse.json({ data: { success: true } })
  }),

  http.patch("http://localhost:8080/api/v1/admin/inventory/variants/:variantId/fulfillment", () => {
    return HttpResponse.json({ data: { success: true } })
  }),
]
