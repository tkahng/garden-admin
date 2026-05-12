import createClient from "openapi-fetch"
import type { paths } from "@/schema"

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
  credentials: "include",
  fetch: (...args) => globalThis.fetch(...args),
})

const TOKEN_KEY = "garden_access_token"
const REFRESH_TOKEN_KEY = "garden_refresh_token"

export function setAuthToken(token: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  setAuthToken(accessToken)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ""
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? ""
}

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

let unauthorizedHandler: (() => void) | null = null
let refreshPromise: Promise<string> | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

async function refreshAccessToken(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8080"}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Refresh failed")
        const json = await response.json() as { data?: { accessToken?: string; refreshToken?: string } }
        const accessToken = json.data?.accessToken
        const nextRefreshToken = json.data?.refreshToken
        if (!accessToken || !nextRefreshToken) throw new Error("Invalid refresh response")
        setAuthTokens(accessToken, nextRefreshToken)
        return accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.use({
  async onRequest({ request }) {
    const token = getAuthToken()
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
    return request
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return response

    const refreshToken = getRefreshToken()
    if (!refreshToken || request.url.includes("/api/v1/auth/refresh")) {
      clearAuthTokens()
      unauthorizedHandler?.()
      return response
    }

    try {
      const accessToken = await refreshAccessToken(refreshToken)
      const retryRequest = request.clone()
      retryRequest.headers.set("Authorization", `Bearer ${accessToken}`)
      return fetch(retryRequest)
    } catch {
      clearAuthTokens()
      unauthorizedHandler?.()
      return response
    }
  },
})
