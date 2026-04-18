import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { AuthProvider, useAuth } from "./auth-context"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts unauthenticated when no stored user", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("restores user from localStorage on mount", () => {
    localStorage.setItem(
      "garden_user",
      JSON.stringify({ id: "1", email: "stored@example.com" })
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe("stored@example.com")
  })

  it("login sets user and stores accessToken", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(() => result.current.login("a@b.com", "password"))

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe("a@b.com")
    expect(localStorage.getItem("garden_access_token")).toBe("test-access-token")
  })

  it("failed login throws", async () => {
    server.use(
      http.post("http://localhost:8080/api/v1/auth/login", () =>
        HttpResponse.json({}, { status: 401 })
      )
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(() => result.current.login("a@b.com", "wrong"))
    ).rejects.toThrow("Login failed")

    expect(result.current.isAuthenticated).toBe(false)
  })

  it("logout clears user and token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(() => result.current.login("a@b.com", "password"))
    expect(result.current.isAuthenticated).toBe(true)

    await act(() => result.current.logout())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem("garden_access_token")).toBeNull()
  })
})
