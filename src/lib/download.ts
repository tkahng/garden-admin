import { getAuthToken } from "@/api/client"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getAuthToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
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

export function downloadCsv(path: string, filename: string): Promise<void> {
  return downloadFile(path, filename)
}

export function downloadPdf(path: string, filename: string): Promise<void> {
  return downloadFile(path, filename)
}
