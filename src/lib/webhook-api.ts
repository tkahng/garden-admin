import { apiClient } from "@/api/client"

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
  listEventTypes: async () => {
    const { data, error } = await apiClient.GET("/api/v1/admin/webhooks/events")
    if (error) throw error
    return (data as { data?: string[] } | undefined)?.data ?? []
  },

  list: async () => {
    const { data, error } = await apiClient.GET("/api/v1/admin/webhooks")
    if (error) throw error
    return (data as { data?: WebhookEndpoint[] } | undefined)?.data ?? []
  },

  create: async (body: CreateWebhookEndpointRequest) => {
    const { data, error } = await apiClient.POST("/api/v1/admin/webhooks", {
      body: body as never,
    })
    if (error) throw error
    return (data as { data?: WebhookEndpoint } | undefined)?.data as WebhookEndpoint
  },

  update: async (id: string, body: UpdateWebhookEndpointRequest) => {
    const { data, error } = await apiClient.PUT("/api/v1/admin/webhooks/{id}", {
      params: { path: { id } },
      body: body as never,
    })
    if (error) throw error
    return (data as { data?: WebhookEndpoint } | undefined)?.data as WebhookEndpoint
  },

  delete: async (id: string) => {
    const { error } = await apiClient.DELETE("/api/v1/admin/webhooks/{id}", {
      params: { path: { id } },
    })
    if (error) throw error
  },

  listDeliveries: async (id: string, page = 0, size = 20) => {
    const { data, error } = await apiClient.GET("/api/v1/admin/webhooks/{id}/deliveries", {
      params: { path: { id }, query: { page, size } },
    })
    if (error) throw error
    return (data as { data?: PagedResult<WebhookDelivery> } | undefined)?.data as PagedResult<WebhookDelivery>
  },
}
