# Test Setup Design

**Date:** 2026-04-14
**Stack:** React 19, Vite 7, TypeScript, TanStack Query, openapi-fetch

## Goal

Add a unit + component test foundation using Vitest and React Testing Library, with MSW intercepting fetch at the network level so the real `apiClient` (including auth middleware) is exercised in tests.

## Dependencies

```
vitest
@vitest/ui
jsdom
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
msw
```

All added as `devDependencies`.

## Config

`vite.config.ts` receives a `test` block — no separate config file needed:

```ts
test: {
  environment: "jsdom",
  setupFiles: ["src/test/setup.ts"],
  globals: true,
}
```

New `package.json` scripts:

```json
"test": "vitest",
"test:ui": "vitest --ui"
```

## Project Structure

```
src/
  test/
    setup.ts              # jest-dom matchers + MSW server lifecycle (beforeAll/afterEach/afterAll)
    server.ts             # MSW Node server instance, exports `server`
    handlers/
      auth.ts             # handlers for /api/v1/auth/*
      admin.ts            # handlers for /api/v1/admin/*
  api/
    client.test.ts        # unit tests for auth token helpers + middleware
  contexts/
    auth-context.test.tsx # unit + MSW tests for login/logout/restore
  pages/
    dashboard/
      index.test.tsx      # component + MSW test for DashboardPage
```

Test files live next to the code they test. MSW handlers in `src/test/handlers/` are shared across all suites.

## MSW Setup

`src/test/server.ts` creates a Node server:

```ts
import { setupServer } from "msw/node"
import { authHandlers } from "./handlers/auth"
import { adminHandlers } from "./handlers/admin"

export const server = setupServer(...authHandlers, ...adminHandlers)
```

`src/test/setup.ts` wires it into the test lifecycle and extends `expect` with jest-dom matchers:

```ts
import "@testing-library/jest-dom"
import { server } from "./server"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`onUnhandledRequest: "error"` ensures tests fail loudly when a request hits no handler — prevents silent misses.

## Initial Test Coverage

### `src/api/client.test.ts` — unit

- `setAuthToken(token)` persists value to `localStorage`
- `setAuthToken("")` removes the key from `localStorage`
- `getAuthToken()` returns empty string when nothing stored
- `getAuthToken()` returns the stored token
- Middleware sets `Authorization: Bearer <token>` header when token present
- Middleware omits `Authorization` header when no token stored

### `src/contexts/auth-context.test.tsx` — unit + MSW

- Successful login POSTs to `/api/v1/auth/login`, stores `accessToken` via `setAuthToken`, sets user state
- Failed login (MSW returns 401) throws an error
- Logout POSTs to `/api/v1/auth/logout`, calls `setAuthToken("")`, clears user state
- `AuthProvider` restores user from `localStorage` on initial render (page refresh simulation)

### `src/pages/dashboard/index.test.tsx` — component + MSW

- Shows loading state (skeleton/spinner) before the API resolves
- Renders four stat cards with values returned by the MSW handler for `/api/v1/admin/stats`
- Does not crash when the API returns an error (renders without throwing)

## What Is Not Covered (Yet)

- Other page components — to be added incrementally
- Router-level tests (navigation, protected routes)
- E2E / Playwright — separate effort after this foundation is stable
