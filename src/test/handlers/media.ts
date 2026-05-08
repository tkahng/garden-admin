import { http, HttpResponse } from "msw"

export const mockBlob = {
  id: "blob-0001-0000-0000-0000-000000000001",
  key: "uploads/abc-hero.jpg",
  filename: "hero.jpg",
  contentType: "image/jpeg",
  size: 204800,
  url: "http://localhost:9000/garden/uploads/abc-hero.jpg",
  alt: "Hero image",
  title: "Hero",
  width: 1200,
  height: 630,
  folder: null,
  createdAt: "2026-03-01T10:00:00.000Z",
}

export const mockBlobInFolder = {
  ...mockBlob,
  id: "blob-0002-0000-0000-0000-000000000002",
  filename: "banner.jpg",
  key: "uploads/abc-banner.jpg",
  url: "http://localhost:9000/garden/uploads/abc-banner.jpg",
  folder: "products",
}

export const mediaHandlers = [
  http.get("http://localhost:8080/api/v1/admin/blobs", () =>
    HttpResponse.json({
      data: {
        content: [mockBlob, mockBlobInFolder],
        meta: { total: 2, page: 0, size: 24 },
      },
    })
  ),

  http.get("http://localhost:8080/api/v1/admin/blobs/folders", () =>
    HttpResponse.json({ data: ["products"] })
  ),

  http.post("http://localhost:8080/api/v1/admin/blobs/move", () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.delete("http://localhost:8080/api/v1/admin/blobs", () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.get("http://localhost:8080/api/v1/admin/blobs/:id/usages", () =>
    HttpResponse.json({ data: [] })
  ),

  http.patch("http://localhost:8080/api/v1/admin/blobs/:id", () =>
    HttpResponse.json({ data: mockBlob })
  ),
]
