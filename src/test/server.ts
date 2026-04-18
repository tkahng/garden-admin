import { setupServer } from "msw/node"
import { authHandlers } from "./handlers/auth"
import { adminHandlers } from "./handlers/admin"
import { productHandlers } from "./handlers/products"
import { orderHandlers } from "./handlers/orders"

export const server = setupServer(...authHandlers, ...adminHandlers, ...productHandlers, ...orderHandlers)
