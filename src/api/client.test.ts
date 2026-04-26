import { describe, it, expect, beforeEach } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { apiClient, setAuthToken, getAuthToken } from "./client"

const TOKEN_KEY = "garden_access_token"

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
})

describe("auth middleware", () => {
  beforeEach(() => {
    localStorage.clear()
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
})
