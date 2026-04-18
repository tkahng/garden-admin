import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { DashboardPage } from "./index"

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <DashboardPage />
    </QueryClientProvider>
  )
}

describe("DashboardPage", () => {
  it("shows loading indicators before data arrives", () => {
    renderDashboard()
    expect(screen.getAllByText("…")).toHaveLength(4)
  })

  it("renders stat cards with values from the API", async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument()
    })
    expect(screen.getByText("$1,000.00")).toBeInTheDocument()
    expect(screen.getByText("$200.00")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("shows dashes and does not crash when the API returns an error", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats", () =>
        HttpResponse.json({}, { status: 500 })
      )
    )
    renderDashboard()
    await waitFor(() => {
      expect(screen.getAllByText("—")).toHaveLength(4)
    })
  })
})
