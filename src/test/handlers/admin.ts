import { http, HttpResponse } from "msw"

export const adminHandlers = [
  http.get("http://localhost:8080/api/v1/admin/stats", () => {
    return HttpResponse.json({
      data: {
        orderCount: 5,
        totalRevenue: 1000,
        averageOrderValue: 200,
        newCustomerCount: 3,
        from: "2026-03-15T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
      },
    })
  }),
  http.get("http://localhost:8080/api/v1/admin/stats/time-series", () => {
    return HttpResponse.json({
      data: [
        { date: "2026-04-01", orderCount: 2, revenue: 400 },
        { date: "2026-04-02", orderCount: 3, revenue: 600 },
      ],
    })
  }),
  http.get("http://localhost:8080/api/v1/admin/stats/top-products", () => {
    return HttpResponse.json({
      data: [
        { productId: "11111111-0000-0000-0000-000000000000", title: "Heirloom Tomato", handle: "heirloom-tomato", orderCount: 4, revenue: 600 },
      ],
    })
  }),
  http.get("http://localhost:8080/api/v1/admin/stats/top-customers", () => {
    return HttpResponse.json({
      data: [
        { userId: "22222222-0000-0000-0000-000000000000", email: "alice@example.com", firstName: "Alice", lastName: "Smith", orderCount: 3, revenue: 500 },
      ],
    })
  }),
]
