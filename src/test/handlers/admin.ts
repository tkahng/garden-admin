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
]
