import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import {
  createRouter,
  createRootRouteWithContext,
  createRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router"
import { createMemoryHistory } from "@tanstack/react-router"
import { Sidebar } from "./sidebar"

const ALL_PATHS = [
  "/", "/orders", "/quotes", "/returns", "/products", "/collections", "/inventory",
  "/pages", "/blogs", "/media", "/customers", "/companies", "/price-lists", "/invoices",
  "/discounts", "/gift-cards", "/settings/locations", "/settings/shipping",
  "/settings/permissions", "/settings/webhooks", "/settings/audit-log",
]

function makeSidebarRouter(initialPath = "/") {
  const rootRoute = createRootRouteWithContext<object>()({
    component: () => (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <Outlet />
      </div>
    ),
  })

  const childRoutes = ALL_PATHS.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => <div data-testid="page-content">{path}</div>,
    })
  )

  const routeTree = rootRoute.addChildren(childRoutes)
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  return createRouter({ routeTree, history, context: {} })
}

async function renderSidebar(initialPath = "/") {
  const router = makeSidebarRouter(initialPath)
  render(<RouterProvider router={router} />)
  await waitFor(() => expect(screen.getByTestId("page-content")).toBeInTheDocument())
  return router
}

describe("Sidebar navigation links", () => {
  it("Home link uses router Link with correct href", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Home/i })
    expect(link.tagName).toBe("A")
    expect(link.getAttribute("href")).toBe("/")
  })

  it("Orders link has correct href for SPA navigation", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Orders/i })
    expect(link.getAttribute("href")).toBe("/orders")
  })

  it("Quotes link has correct href", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Quotes/i })
    expect(link.getAttribute("href")).toBe("/quotes")
  })

  it("Returns link has correct href", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Returns/i })
    expect(link.getAttribute("href")).toBe("/returns")
  })

  it("Customers link has correct href", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Customers/i })
    expect(link.getAttribute("href")).toBe("/customers")
  })

  it("Discounts link has correct href", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Discounts/i })
    expect(link.getAttribute("href")).toBe("/discounts")
  })

  it("Gift cards link has correct href", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Gift cards/i })
    expect(link.getAttribute("href")).toBe("/gift-cards")
  })

  it("Settings Locations child link has correct href when section is expanded", async () => {
    await renderSidebar("/settings/locations")
    const link = screen.getByRole("link", { name: /Locations/i })
    expect(link.getAttribute("href")).toBe("/settings/locations")
  })

  it("Settings Webhooks child link has correct href when section is expanded", async () => {
    await renderSidebar("/settings/webhooks")
    const link = screen.getByRole("link", { name: /Webhooks/i })
    expect(link.getAttribute("href")).toBe("/settings/webhooks")
  })

  it("Settings Audit log child link has correct href when section is expanded", async () => {
    await renderSidebar("/settings/audit-log")
    const link = screen.getByRole("link", { name: /Audit log/i })
    expect(link.getAttribute("href")).toBe("/settings/audit-log")
  })

  it("Home link has active styling on root path", async () => {
    await renderSidebar("/")
    const link = screen.getByRole("link", { name: /Home/i })
    expect(link.classList.contains("bg-sidebar-accent")).toBe(true)
  })

  it("Orders link has active styling when on /orders", async () => {
    await renderSidebar("/orders")
    const link = screen.getByRole("link", { name: /Orders/i })
    expect(link.classList.contains("bg-sidebar-accent")).toBe(true)
  })

  it("Home link does not have active styling when on /orders", async () => {
    await renderSidebar("/orders")
    const link = screen.getByRole("link", { name: /Home/i })
    expect(link.classList.contains("bg-sidebar-accent")).toBe(false)
  })
})
