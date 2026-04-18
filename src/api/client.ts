import createClient from "openapi-fetch"
import type { paths } from "@/schema"

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
  credentials: "include",
  fetch: (...args) => globalThis.fetch(...args),
})

const TOKEN_KEY = "garden_access_token"

export function setAuthToken(token: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ""
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

apiClient.use({
  async onRequest({ request }) {
    const token = getAuthToken()
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
    return request
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      setAuthToken("")
      unauthorizedHandler?.()
    }
    return response
  },
})
