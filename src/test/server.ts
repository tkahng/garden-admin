import { setupServer } from "msw/node"
import { authHandlers } from "./handlers/auth"
import { adminHandlers } from "./handlers/admin"

export const server = setupServer(...authHandlers, ...adminHandlers)
