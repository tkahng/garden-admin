import { http, HttpResponse } from "msw"

export const mockProduct = {
  id: 1,
  title: "Classic Garden Chair",
  handle: "classic-garden-chair",
  status: "ACTIVE",
  description: "A sturdy outdoor chair.",
  vendor: "Garden Co.",
  productType: "Furniture",
  tags: ["outdoor", "seating"],
  images: [{ id: 10, url: "https://example.com/chair.jpg", altText: "Chair" }],
  variants: [
    { id: 101, title: "Default", price: 49.99, sku: "CGC-001", inventoryQuantity: 10 },
    { id: 102, title: "Large", price: 59.99, sku: "CGC-002", inventoryQuantity: 5 },
  ],
  options: [
    { id: 201, name: "Size", values: [{ id: 301, value: "Default" }, { id: 302, value: "Large" }] },
  ],
}

export const productHandlers = [
  http.get("http://localhost:8080/api/v1/admin/products", () => {
    return HttpResponse.json({
      data: {
        content: [mockProduct],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  }),

  http.get("http://localhost:8080/api/v1/admin/products/:id", () => {
    return HttpResponse.json({ data: mockProduct })
  }),

  http.patch("http://localhost:8080/api/v1/admin/products/:id/status", () => {
    return HttpResponse.json({ data: { ...mockProduct, status: "DRAFT" } })
  }),

  http.patch("http://localhost:8080/api/v1/admin/products/:id", () => {
    return HttpResponse.json({ data: mockProduct })
  }),

  http.delete("http://localhost:8080/api/v1/admin/products/:id/variants/:vId", () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
