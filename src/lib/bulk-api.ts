import { getAuthToken } from "@/api/client"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

async function bulkPost(path: string, body: object): Promise<void> {
  const token = getAuthToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Bulk action failed: HTTP ${res.status}`)
}

async function bulkPatch(path: string, body: object): Promise<void> {
  const token = getAuthToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Bulk action failed: HTTP ${res.status}`)
}

export function bulkChangeProductStatus(ids: string[], status: string) {
  return bulkPatch("/api/v1/admin/products/bulk/status", { ids, status })
}

export function bulkDeleteProducts(ids: string[]) {
  return bulkPost("/api/v1/admin/products/bulk/delete", { ids })
}

export function bulkCancelOrders(ids: string[]) {
  return bulkPost("/api/v1/admin/orders/bulk/cancel", { ids })
}

export function bulkSuspendUsers(ids: string[]) {
  return bulkPost("/api/v1/admin/users/bulk/suspend", { ids })
}

export function bulkReactivateUsers(ids: string[]) {
  return bulkPost("/api/v1/admin/users/bulk/reactivate", { ids })
}
