import { getAuthToken } from "@/api/client"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  const json = await res.json()
  return json.data as T
}

export interface WebhookEndpoint {
  id: string
  url: string
  description: string | null
  events: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  eventType: string
  payload: Record<string, unknown>
  status: "PENDING" | "SUCCESS" | "FAILED" | "RETRYING"
  attemptCount: number
  lastAttemptedAt: string | null
  nextRetryAt: string | null
  httpStatus: number | null
  responseBody: string | null
  createdAt: string
}

export interface CreateWebhookEndpointRequest {
  url: string
  secret: string
  description?: string
  events: string[]
}

export interface UpdateWebhookEndpointRequest {
  url?: string
  secret?: string
  description?: string
  events?: string[]
  active?: boolean
}

export interface PagedResult<T> {
  content: T[]
  meta: { page: number; pageSize: number; total: number }
}

export const webhookApi = {
  listEventTypes: () =>
    apiFetch<string[]>("/api/v1/admin/webhooks/events"),

  list: () =>
    apiFetch<WebhookEndpoint[]>("/api/v1/admin/webhooks"),

  create: (body: CreateWebhookEndpointRequest) =>
    apiFetch<WebhookEndpoint>("/api/v1/admin/webhooks", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: UpdateWebhookEndpointRequest) =>
    apiFetch<WebhookEndpoint>(`/api/v1/admin/webhooks/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/admin/webhooks/${id}`, { method: "DELETE" }),

  listDeliveries: (id: string, page = 0, size = 20) =>
    apiFetch<PagedResult<WebhookDelivery>>(
      `/api/v1/admin/webhooks/${id}/deliveries?page=${page}&size=${size}`
    ),
}
