import createClient from "openapi-fetch"
import type { paths } from "@/schema"
import { API_URL } from "@/lib/config"

export const apiClient = createClient<paths>({
  baseUrl: API_URL,
  credentials: "include",
  fetch: (...args) => globalThis.fetch(...args),
})

const publicApiClient = createClient<paths>({
  baseUrl: API_URL,
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

class AuthRefreshError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthRefreshError"
  }
}

async function refreshAccessToken(usedRefreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = publicApiClient
      .POST("/api/v1/auth/refresh", { body: { refreshToken: usedRefreshToken } })
      .then(({ data, error }) => {
        if (error) {
          // Another tab may have already rotated the token while this request was in
          // flight. If localStorage now holds a different refresh token, reuse its
          // paired access token instead of forcing a logout.
          const currentRefresh = getRefreshToken()
          if (currentRefresh && currentRefresh !== usedRefreshToken) {
            const currentAccess = getAuthToken()
            if (currentAccess) return currentAccess
          }
          throw new AuthRefreshError("Refresh token rejected by server")
        }
        const accessToken = data?.data?.accessToken
        const nextRefreshToken = data?.data?.refreshToken
        if (!accessToken || !nextRefreshToken) throw new AuthRefreshError("Invalid refresh response")
        setAuthTokens(accessToken, nextRefreshToken)
        return accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await globalThis.fetch(input, { ...init, headers })
  if (res.status !== 401) return res

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearAuthTokens()
    unauthorizedHandler?.()
    return res
  }

  try {
    const newToken = await refreshAccessToken(refreshToken)
    headers.set('Authorization', `Bearer ${newToken}`)
    return globalThis.fetch(input, { ...init, headers })
  } catch (err) {
    if (err instanceof AuthRefreshError) {
      clearAuthTokens()
      unauthorizedHandler?.()
    }
    return res
  }
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
    } catch (err) {
      // Only revoke the session for definitive auth failures. Transient network
      // errors (TypeError) should not log the user out — they can retry later.
      if (err instanceof AuthRefreshError) {
        clearAuthTokens()
        unauthorizedHandler?.()
      }
      return response
    }
  },
})
