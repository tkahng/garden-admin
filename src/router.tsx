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
import { CustomerDetailPage } from "@/pages/customers/detail"
import { CompaniesPage } from "@/pages/companies"
import { QuotesPage } from "@/pages/quotes"
import { PagesPage } from "@/pages/content/pages"
import { BlogsPage } from "@/pages/content/blogs"
import { DiscountsPage } from "@/pages/discounts"
import { GiftCardsPage } from "@/pages/gift-cards"
import { LocationsPage } from "@/pages/settings/locations"
import { ShippingPage } from "@/pages/settings/shipping"
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
      { path: "customers/:id", element: <CustomerDetailPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "pages", element: <PagesPage /> },
      { path: "blogs", element: <BlogsPage /> },
      { path: "discounts", element: <DiscountsPage /> },
      { path: "gift-cards", element: <GiftCardsPage /> },
      { path: "settings/locations", element: <LocationsPage /> },
      { path: "settings/shipping", element: <ShippingPage /> },
      { path: "settings/permissions", element: <PermissionsPage /> },
    ],
  },
])
