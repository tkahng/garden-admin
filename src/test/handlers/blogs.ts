import { http, HttpResponse } from "msw"

export const mockBlog = {
  id: "blog0001-0000-0000-0000-000000000001",
  title: "Garden Tips",
  handle: "garden-tips",
  createdAt: "2026-01-10T00:00:00.000Z",
}

export const blogHandlers = [
  http.get("http://localhost:8080/api/v1/admin/blogs", () =>
    HttpResponse.json({
      data: {
        content: [mockBlog],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),

  http.post("http://localhost:8080/api/v1/admin/blogs", () =>
    HttpResponse.json({ data: mockBlog })
  ),

  http.put("http://localhost:8080/api/v1/admin/blogs/:id", () =>
    HttpResponse.json({ data: mockBlog })
  ),

  http.delete("http://localhost:8080/api/v1/admin/blogs/:id", () =>
    new HttpResponse(null, { status: 204 })
  ),
]
