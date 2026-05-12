import { describe, it, expect, beforeEach } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import {
  apiClient,
  clearAuthTokens,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setAuthTokens,
  setUnauthorizedHandler,
} from "./client"

const TOKEN_KEY = "garden_access_token"
const REFRESH_TOKEN_KEY = "garden_refresh_token"

describe("setAuthToken / getAuthToken", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("persists token to localStorage", () => {
    setAuthToken("abc123")
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123")
  })

  it("removes key when empty string is passed", () => {
    localStorage.setItem(TOKEN_KEY, "old-token")
    setAuthToken("")
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it("returns empty string when nothing is stored", () => {
    expect(getAuthToken()).toBe("")
  })

  it("returns the stored token", () => {
    localStorage.setItem(TOKEN_KEY, "mytoken")
    expect(getAuthToken()).toBe("mytoken")
  })

  it("persists token pair to localStorage", () => {
    setAuthTokens("access", "refresh")
    expect(localStorage.getItem(TOKEN_KEY)).toBe("access")
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh")
    expect(getRefreshToken()).toBe("refresh")
  })

  it("clears token pair from localStorage", () => {
    setAuthTokens("access", "refresh")
    clearAuthTokens()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
  })
})

describe("auth middleware", () => {
  beforeEach(() => {
    localStorage.clear()
    setUnauthorizedHandler(null)
  })

  it("injects Authorization header when token is present", async () => {
    setAuthToken("test-token")
    let capturedAuth: string | null = null

    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats", ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ data: null })
      })
    )

    await apiClient.GET("/api/v1/admin/stats", {
      params: { query: { from: "2026-01-01", to: "2026-04-14" } },
    })

    expect(capturedAuth).toBe("Bearer test-token")
  })

  it("omits Authorization header when no token is stored", async () => {
    let capturedAuth: string | null = "sentinel"

    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats", ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ data: null })
      })
    )

    await apiClient.GET("/api/v1/admin/stats", {
      params: { query: { from: "2026-01-01", to: "2026-04-14" } },
    })

    expect(capturedAuth).toBeNull()
  })

  it("refreshes access token on 401 and retries the original request", async () => {
    setAuthTokens("expired-token", "refresh-token")
    const authHeaders: string[] = []
    let refreshCalled = false

    server.use(
      http.post("http://localhost:8080/api/v1/auth/refresh", async ({ request }) => {
        refreshCalled = true
        expect(await request.json()).toEqual({ refreshToken: "refresh-token" })
        return HttpResponse.json({
          data: {
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
          },
        })
      }),
      http.get("http://localhost:8080/api/v1/admin/stats", ({ request }) => {
        const auth = request.headers.get("Authorization") ?? ""
        authHeaders.push(auth)
        if (auth === "Bearer expired-token") {
          return HttpResponse.json({}, { status: 401 })
        }
        return HttpResponse.json({ data: { ok: true } })
      })
    )

    await apiClient.GET("/api/v1/admin/stats", {
      params: { query: { from: "2026-01-01", to: "2026-04-14" } },
    })

    expect(refreshCalled).toBe(true)
    expect(authHeaders).toEqual(["Bearer expired-token", "Bearer new-access-token"])
    expect(getAuthToken()).toBe("new-access-token")
    expect(getRefreshToken()).toBe("new-refresh-token")
  })

  it("clears auth and notifies when refresh fails", async () => {
    setAuthTokens("expired-token", "refresh-token")
    let unauthorized = false
    setUnauthorizedHandler(() => {
      unauthorized = true
    })

    server.use(
      http.post("http://localhost:8080/api/v1/auth/refresh", () =>
        HttpResponse.json({}, { status: 401 })
      ),
      http.get("http://localhost:8080/api/v1/admin/stats", () =>
        HttpResponse.json({}, { status: 401 })
      )
    )

    await apiClient.GET("/api/v1/admin/stats", {
      params: { query: { from: "2026-01-01", to: "2026-04-14" } },
    })

    expect(unauthorized).toBe(true)
    expect(getAuthToken()).toBe("")
    expect(getRefreshToken()).toBe("")
  })
})
