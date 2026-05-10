import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  createRouter,
  createRootRouteWithContext,
  createRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router"
import { createMemoryHistory } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { mockCompany } from "@/test/handlers/companies"
import { CompaniesPage } from "./index"

function makeRouter(initialPath = "/companies") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <QueryClientProvider client={qc}>
        <Outlet />
      </QueryClientProvider>
    ),
  })

  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
    component: () => <Outlet />,
  })

  const companiesLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "companies",
    component: () => <Outlet />,
  })

  const companiesIndexRoute = createRoute({
    getParentRoute: () => companiesLayoutRoute,
    path: "/",
    component: CompaniesPage,
  })

  const companyDetailRoute = createRoute({
    getParentRoute: () => companiesLayoutRoute,
    path: "$companyId",
    component: () => <div>Company Detail</div>,
  })

  const routeTree = rootRoute.addChildren([
    authenticatedRoute.addChildren([
      companiesLayoutRoute.addChildren([companiesIndexRoute, companyDetailRoute]),
    ]),
  ])

  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return { router: createRouter({ routeTree, history, context: {} }), qc }
}

function renderCompanies(initialPath = "/companies") {
  const { router } = makeRouter(initialPath)
  render(<RouterProvider router={router} />)
  return router
}

describe("CompaniesPage", () => {
  beforeEach(() => localStorage.clear())

  it("shows loading state before data arrives", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/companies", () => new Promise(() => {}))
    )
    renderCompanies()
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument()
    })
  })

  it("renders company row with name and tax id", async () => {
    renderCompanies()
    await waitFor(() => {
      expect(screen.getByText(mockCompany.name)).toBeInTheDocument()
    })
    expect(screen.getByText(mockCompany.taxId)).toBeInTheDocument()
  })

  it("shows empty state when no companies returned", async () => {
    server.use(
      http.get("http://localhost:8080/api/v1/companies", () =>
        HttpResponse.json({ data: [] })
      )
    )
    renderCompanies()
    await waitFor(() => {
      expect(screen.getByText("No companies found.")).toBeInTheDocument()
    })
  })

  it("company name links to detail page", async () => {
    renderCompanies()
    await waitFor(() => {
      const link = screen.getByRole("link", { name: mockCompany.name })
      expect(link).toHaveAttribute("href", `/companies/${mockCompany.id}`)
    })
  })

  it("clicking company link navigates to detail page", async () => {
    const user = userEvent.setup()
    renderCompanies()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: mockCompany.name })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("link", { name: mockCompany.name }))

    await waitFor(() => {
      expect(screen.getByText("Company Detail")).toBeInTheDocument()
    })
    expect(screen.queryByText(mockCompany.name)).not.toBeInTheDocument()
  })
})
