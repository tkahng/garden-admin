import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function InnerApp() {
  const auth = useAuth()
  return <RouterProvider router={router} context={{ auth }} />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InnerApp />
          <Toaster richColors />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
