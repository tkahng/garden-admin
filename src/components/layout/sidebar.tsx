import { Link, useLocation } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  BookOpen,
  Users,
  Building2,
  ClipboardList,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Store,
  Tag,
  Gift,
  Truck,
} from "lucide-react"
import { useState } from "react"

interface NavItem {
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    label: "Quotes",
    href: "/quotes",
    icon: ClipboardList,
  },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "All products", href: "/products" },
      { label: "Collections", href: "/collections" },
      { label: "Inventory", href: "/inventory" },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    children: [
      { label: "Pages", href: "/pages" },
      { label: "Blogs", href: "/blogs" },
      { label: "Media library", href: "/media" },
    ],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    label: "B2B",
    icon: Building2,
    children: [
      { label: "Companies", href: "/companies" },
      { label: "Price lists", href: "/price-lists" },
      { label: "Invoices", href: "/invoices" },
    ],
  },
  {
    label: "Discounts",
    href: "/discounts",
    icon: Tag,
  },
  {
    label: "Gift cards",
    href: "/gift-cards",
    icon: Gift,
  },
]

const settingsItems: NavItem[] = [
  {
    label: "Locations",
    href: "/settings/locations",
    icon: MapPin,
  },
  {
    label: "Shipping",
    href: "/settings/shipping",
    icon: Truck,
  },
  {
    label: "Users & permissions",
    href: "/settings/permissions",
    icon: ShieldCheck,
  },
]

function NavGroup({ item }: { item: NavItem }) {
  const location = useLocation()
  const isChildActive = item.children?.some((c) => location.pathname.startsWith(c.href))
  const [open, setOpen] = useState(isChildActive ?? false)

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isChildActive && "text-sidebar-primary"
          )}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
            {item.children.map((child) => (
              <Link
                key={child.href}
                to={child.href}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  location.pathname === child.href ||
                    (child.href !== "/" && location.pathname.startsWith(child.href))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive =
    item.href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.href!)

  return (
    <Link
      to={item.href!}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  )
}

export function Sidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-screen w-64 shrink-0 flex-col border-r">
      {/* Store header */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary flex size-7 items-center justify-center rounded-md">
          <Store className="text-primary-foreground size-4" />
        </div>
        <span className="text-sm font-semibold">Garden Admin</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavGroup key={item.label} item={item} />
          ))}
        </div>

        {/* Settings group */}
        <div className="mt-6">
          <p className="mb-1 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Settings
          </p>
          <div className="flex flex-col gap-0.5">
            {settingsItems.map((item) => (
              <NavGroup key={item.label} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom: docs link */}
      <div className="border-t p-3">
        <a
          href="#"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <BookOpen className="size-4" />
          Help & support
        </a>
      </div>
    </aside>
  )
}
