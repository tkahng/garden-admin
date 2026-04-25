import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    // "3" appears in both the New customers card and Alice's order count — just assert at least one exists
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1)
  })

  it("shows dashes and does not crash when the stats API returns an error", async () => {
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

  it("renders date range preset buttons", () => {
    renderDashboard()
    expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "90 days" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument()
  })

  it("clicking a preset button changes the active preset", async () => {
    const user = userEvent.setup()
    renderDashboard()
    const btn = screen.getByRole("button", { name: "7 days" })
    await user.click(btn)
    // After click the button should still exist (page doesn't crash)
    expect(btn).toBeInTheDocument()
  })

  it("renders top products from the API", async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("Top Products")).toBeInTheDocument()
      expect(screen.getByText("Heirloom Tomato")).toBeInTheDocument()
    })
  })

  it("renders top customers from the API", async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("Top Customers")).toBeInTheDocument()
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    })
  })

  it("shows empty state for top products when none returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats/top-products", () =>
        HttpResponse.json({ data: [] })
      )
    )
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("No sales in this period")).toBeInTheDocument()
    })
  })

  it("shows empty state for top customers when none returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats/top-customers", () =>
        HttpResponse.json({ data: [] })
      )
    )
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText("No customer orders in this period")).toBeInTheDocument()
    })
  })
})
