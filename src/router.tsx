import { createBrowserRouter } from "react-router"
import { AppLayout } from "@/components/layout/app-layout"
import { LoginPage } from "@/pages/auth/login"
import { DashboardPage } from "@/pages/dashboard"
import { OrdersPage } from "@/pages/orders"
import { OrderDetailPage } from "@/pages/orders/detail"
import { ProductsPage } from "@/pages/products"
import { CollectionsPage } from "@/pages/collections"
import { InventoryPage } from "@/pages/inventory"
import { CustomersPage } from "@/pages/customers"
import { CompaniesPage } from "@/pages/companies"
import { QuotesPage } from "@/pages/quotes"
import { PagesPage } from "@/pages/content/pages"
import { BlogsPage } from "@/pages/content/blogs"
import { LocationsPage } from "@/pages/settings/locations"
import { PermissionsPage } from "@/pages/settings/permissions"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },
      { path: "quotes", element: <QuotesPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "collections", element: <CollectionsPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "pages", element: <PagesPage /> },
      { path: "blogs", element: <BlogsPage /> },
      { path: "settings/locations", element: <LocationsPage /> },
      { path: "settings/permissions", element: <PermissionsPage /> },
    ],
  },
])
