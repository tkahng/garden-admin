import { apiClient } from "@/api/client"

export async function bulkChangeProductStatus(ids: string[], status: "DRAFT" | "ACTIVE" | "ARCHIVED") {
  const { error } = await apiClient.PATCH("/api/v1/admin/products/bulk/status", {
    body: { ids, status },
  })
  if (error) throw new Error(`Bulk action failed`)
}

export async function bulkDeleteProducts(ids: string[]) {
  const { error } = await apiClient.POST("/api/v1/admin/products/bulk/delete", {
    body: { ids },
  })
  if (error) throw new Error(`Bulk action failed`)
}

export async function bulkCancelOrders(ids: string[]) {
  const { error } = await apiClient.POST("/api/v1/admin/orders/bulk/cancel", {
    body: { ids },
  })
  if (error) throw new Error(`Bulk action failed`)
}

export async function bulkSuspendUsers(ids: string[]) {
  const { error } = await apiClient.POST("/api/v1/admin/users/bulk/suspend", {
    body: { ids },
  })
  if (error) throw new Error(`Bulk action failed`)
}

export async function bulkReactivateUsers(ids: string[]) {
  const { error } = await apiClient.POST("/api/v1/admin/users/bulk/reactivate", {
    body: { ids },
  })
  if (error) throw new Error(`Bulk action failed`)
}
