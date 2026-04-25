import { getAuthToken } from "@/api/client"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = getAuthToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
