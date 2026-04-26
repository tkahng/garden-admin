import { http, HttpResponse } from "msw"

export const mockPage = {
  id: "page-001-0000-0000-0000-000000000001",
  title: "About Us",
  handle: "about-us",
  body: "<p>About us content</p>",
  status: "PUBLISHED",
  publishedAt: "2026-03-01T10:00:00.000Z",
  metaTitle: "About Us | Store",
  metaDescription: "Learn about our company",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
}

export const pageHandlers = [
  http.get("http://localhost:8080/api/v1/admin/pages", () =>
    HttpResponse.json({
      data: {
        content: [mockPage],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),

  http.post("http://localhost:8080/api/v1/admin/pages", () =>
    HttpResponse.json({ data: mockPage })
  ),

  http.put("http://localhost:8080/api/v1/admin/pages/:id", () =>
    HttpResponse.json({ data: mockPage })
  ),

  http.patch("http://localhost:8080/api/v1/admin/pages/:id/status", () =>
    HttpResponse.json({ data: { ...mockPage, status: "DRAFT" } })
  ),

  http.delete("http://localhost:8080/api/v1/admin/pages/:id", () =>
    new HttpResponse(null, { status: 204 })
  ),
]
