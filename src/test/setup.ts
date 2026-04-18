import "@testing-library/jest-dom"
import { vi } from "vitest"
import { server } from "./server"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Radix UI primitives use pointer capture APIs not implemented in jsdom
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()
