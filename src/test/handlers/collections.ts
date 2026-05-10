import { http, HttpResponse } from "msw"

export const mockCollection = {
  id: "coll0001-0000-0000-0000-000000000001",
  title: "Spring Collection",
  collectionType: "MANUAL",
  status: "ACTIVE",
  productCount: 4,
}

export const collectionHandlers = [
  http.get("http://localhost:8080/api/v1/admin/collections", () =>
    HttpResponse.json({
      data: {
        content: [mockCollection],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),
]
