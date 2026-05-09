import { apiClient } from "@/api/client"

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  beforeJson: string | null
  afterJson: string | null
  createdAt: string
}

export interface AuditLogPage {
  content: AuditLogEntry[]
  meta: { page: number; pageSize: number; total: number }
}

export interface AuditLogFilters {
  entityType?: string
  entityId?: string
  actorEmail?: string
  page?: number
  size?: number
}

export const auditLogApi = {
  list: async (filters: AuditLogFilters = {}): Promise<AuditLogPage> => {
    const { entityType, entityId, actorEmail, page = 0, size = 25 } = filters
    const { data, error } = await apiClient.GET("/api/v1/admin/audit-log" as never, {
      params: {
        query: {
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          actorEmail: actorEmail || undefined,
          page,
          size,
        } as never,
      },
    })
    if (error) throw error
    return (data as { data?: AuditLogPage } | undefined)?.data as AuditLogPage
  },
}
