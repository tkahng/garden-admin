import { setupServer } from "msw/node"
import { authHandlers } from "./handlers/auth"
import { adminHandlers } from "./handlers/admin"
import { productHandlers } from "./handlers/products"
import { orderHandlers } from "./handlers/orders"
import { customerHandlers } from "./handlers/customers"
import { pageHandlers } from "./handlers/pages"
import { giftCardHandlers } from "./handlers/gift-cards"

export const server = setupServer(
  ...authHandlers,
  ...adminHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...customerHandlers,
  ...pageHandlers,
  ...giftCardHandlers,
)
