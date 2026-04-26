import { http, HttpResponse } from "msw"

export const authHandlers = [
  http.post("http://localhost:8080/api/v1/auth/login", () => {
    return HttpResponse.json({
      data: {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      },
    })
  }),

  http.post("http://localhost:8080/api/v1/auth/logout", () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
