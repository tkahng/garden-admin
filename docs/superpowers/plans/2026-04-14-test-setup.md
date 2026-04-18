# Test Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Vitest + React Testing Library + MSW test foundation covering auth token logic, the auth context, and the dashboard page.

**Architecture:** Vitest runs tests in a jsdom environment. MSW intercepts `fetch` at the Node level so `apiClient` (including its Bearer token middleware) is exercised without mocking. Tests live next to the code they test; shared MSW handlers live in `src/test/`.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, msw, jsdom

---

## Deviations from Plan (implemented 2026-04-17)

### 1. `auth-context.tsx` decoupled from `main.tsx` before Task 4

**Problem:** `auth-context.tsx` imported `router` from `@/main`. `main.tsx` calls `createRoot(document.getElementById("root")!)` at module level — in jsdom, `getElementById("root")` returns `null`, so importing `auth-context.tsx` in any test would crash immediately. There was also a circular dependency (`auth-context` → `main` → `auth-context`).

**Fix:** Added `setNavigationHandler(handler)` export to `auth-context.tsx` (same pattern already used by `setUnauthorizedHandler` in `client.ts`). The `router.navigate(...)` call was replaced with `navigationHandler?.(redirectTo)`. In `main.tsx`, `setNavigationHandler` is called once after `router` is created. `auth-context.tsx` no longer imports anything from `main.tsx`.

### 2. `apiClient` fetch wrapper in `client.ts`

**Problem:** `openapi-fetch`'s `createClient` captures `globalThis.fetch` at **creation time** (`fetch: baseFetch = globalThis.fetch` in its source). Since `apiClient` is a module-level singleton, it holds a reference to the pre-MSW `fetch`. MSW patches `globalThis.fetch` in `beforeAll`, which runs after imports — so the patched fetch was never used by `apiClient`, causing `ECONNREFUSED` instead of MSW interception.

**Fix:** Pass a wrapper to `createClient` that defers `fetch` resolution to call time:

```ts
fetch: (...args) => globalThis.fetch(...args),
```

This ensures MSW's patched `fetch` is always used during tests.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `vite.config.ts` | Add `test` block (jsdom, setup file, globals) |
| Modify | `package.json` | Add `test` and `test:ui` scripts |
| Create | `src/test/setup.ts` | jest-dom + MSW server lifecycle |
| Create | `src/test/server.ts` | MSW Node server instance |
| Create | `src/test/handlers/auth.ts` | MSW handlers for `/api/v1/auth/*` |
| Create | `src/test/handlers/admin.ts` | MSW handlers for `/api/v1/admin/*` |
| Create | `src/api/client.test.ts` | Unit tests for token helpers + middleware |
| Create | `src/contexts/auth-context.test.tsx` | Unit + MSW tests for login/logout/restore |
| Create | `src/pages/dashboard/index.test.tsx` | Component + MSW tests for DashboardPage |

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  msw
```

Expected: packages added under `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 3: Update `vite.config.ts` to add the test block**

Replace the import from `"vite"` with `"vitest/config"` for full type support, and add a `test` block:

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true,
  },
})
```

- [ ] **Step 4: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore(test): install vitest, RTL, MSW and configure jsdom environment"
```

---

## Task 2: Create MSW infrastructure

**Files:**
- Create: `src/test/handlers/auth.ts`
- Create: `src/test/handlers/admin.ts`
- Create: `src/test/server.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create auth handlers**

Create `src/test/handlers/auth.ts`:

```ts
import { http, HttpResponse } from "msw"

export const authHandlers = [
  http.post("http://localhost:8080/api/v1/auth/login", () => {
    return HttpResponse.json({
      data: {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      },
    })
  }),

  http.post("http://localhost:8080/api/v1/auth/logout", () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
```

- [ ] **Step 2: Create admin handlers**

Create `src/test/handlers/admin.ts`:

```ts
import { http, HttpResponse } from "msw"

export const adminHandlers = [
  http.get("http://localhost:8080/api/v1/admin/stats", () => {
    return HttpResponse.json({
      data: {
        orderCount: 5,
        totalRevenue: 1000,
        averageOrderValue: 200,
        newCustomerCount: 3,
        from: "2026-03-15T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
      },
    })
  }),
]
```

- [ ] **Step 3: Create the MSW Node server**

Create `src/test/server.ts`:

```ts
import { setupServer } from "msw/node"
import { authHandlers } from "./handlers/auth"
import { adminHandlers } from "./handlers/admin"

export const server = setupServer(...authHandlers, ...adminHandlers)
```

- [ ] **Step 4: Create the Vitest setup file**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom"
import { server } from "./server"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`onUnhandledRequest: "error"` causes tests to fail if the code makes a request with no matching handler — catches typos in URLs early.

- [ ] **Step 5: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/test/
git commit -m "chore(test): add MSW server and handlers for auth and admin endpoints"
```

---

## Task 3: Write `client.test.ts`

**Files:**
- Create: `src/api/client.test.ts`

The implementation (`setAuthToken`, `getAuthToken`, middleware) already exists. These tests verify it works as designed.

- [ ] **Step 1: Write the test file**

Create `src/api/client.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { apiClient, setAuthToken, getAuthToken } from "./client"

const TOKEN_KEY = "garden_access_token"

describe("setAuthToken / getAuthToken", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("persists token to localStorage", () => {
    setAuthToken("abc123")
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123")
  })

  it("removes key when empty string is passed", () => {
    localStorage.setItem(TOKEN_KEY, "old-token")
    setAuthToken("")
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it("returns empty string when nothing is stored", () => {
    expect(getAuthToken()).toBe("")
  })

  it("returns the stored token", () => {
    localStorage.setItem(TOKEN_KEY, "mytoken")
    expect(getAuthToken()).toBe("mytoken")
  })
})

describe("auth middleware", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("injects Authorization header when token is present", async () => {
    setAuthToken("test-token")
    let capturedAuth: string | null = null

    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats", ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ data: null })
      })
    )

    await apiClient.GET("/api/v1/admin/stats", {
      params: { query: { from: "2026-01-01", to: "2026-04-14" } },
    })

    expect(capturedAuth).toBe("Bearer test-token")
  })

  it("omits Authorization header when no token is stored", async () => {
    let capturedAuth: string | null = "sentinel"

    server.use(
      http.get("http://localhost:8080/api/v1/admin/stats", ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ data: null })
      })
    )

    await apiClient.GET("/api/v1/admin/stats", {
      params: { query: { from: "2026-01-01", to: "2026-04-14" } },
    })

    expect(capturedAuth).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/api/client.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/api/client.test.ts
git commit -m "test(api): add unit tests for auth token helpers and Bearer middleware"
```

---

## Task 4: Write `auth-context.test.tsx`

**Files:**
- Create: `src/contexts/auth-context.test.tsx`

- [ ] **Step 1: Write the test file**

Create `src/contexts/auth-context.test.tsx`:

```tsx
import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/server"
import { AuthProvider, useAuth } from "./auth-context"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts unauthenticated when no stored user", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("restores user from localStorage on mount", () => {
    localStorage.setItem(
      "garden_user",
      JSON.stringify({ id: "1", email: "stored@example.com" })
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe("stored@example.com")
  })

  it("login sets user and stores accessToken", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(() => result.current.login("a@b.com", "password"))

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe("a@b.com")
    expect(localStorage.getItem("garden_access_token")).toBe("test-access-token")
  })

  it("failed login throws", async () => {
    server.use(
      http.post("http://localhost:8080/api/v1/auth/login", () =>
        HttpResponse.json({}, { status: 401 })
      )
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(
      act(() => result.current.login("a@b.com", "wrong"))
    ).rejects.toThrow("Login failed")

    expect(result.current.isAuthenticated).toBe(false)
  })

  it("logout clears user and token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(() => result.current.login("a@b.com", "password"))
    expect(result.current.isAuthenticated).toBe(true)

    await act(() => result.current.logout())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem("garden_access_token")).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/contexts/auth-context.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/auth-context.test.tsx
git commit -m "test(auth): add unit tests for AuthProvider login, logout, and session restore"
```

---

## Task 5: Write `dashboard/index.test.tsx`

**Files:**
- Create: `src/pages/dashboard/index.test.tsx`

- [ ] **Step 1: Write the test file**

Create `src/pages/dashboard/index.test.tsx`:

```tsx
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
    // Each of the 4 stat cards shows "…" while loading
    expect(screen.getAllByText("…")).toHaveLength(4)
  })

  it("renders stat cards with values from the API", async () => {
    renderDashboard()
    // MSW default admin handler returns orderCount:5, totalRevenue:1000,
    // averageOrderValue:200, newCustomerCount:3
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
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/pages/dashboard/index.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 3: Run the full suite**

```bash
npx vitest run
```

Expected: all 14 tests across 3 files pass, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/index.test.tsx
git commit -m "test(dashboard): add component tests for DashboardPage stats rendering"
```
