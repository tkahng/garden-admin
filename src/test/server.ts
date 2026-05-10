import { setupServer } from "msw/node"
import { authHandlers } from "./handlers/auth"
import { adminHandlers } from "./handlers/admin"
import { productHandlers } from "./handlers/products"
import { orderHandlers } from "./handlers/orders"
import { customerHandlers } from "./handlers/customers"
import { pageHandlers } from "./handlers/pages"
import { giftCardHandlers } from "./handlers/gift-cards"
import { mediaHandlers } from "./handlers/media"
import { quoteHandlers } from "./handlers/quotes"
import { companyHandlers } from "./handlers/companies"
import { invoiceHandlers } from "./handlers/invoices"
import { collectionHandlers } from "./handlers/collections"
import { blogHandlers } from "./handlers/blogs"

export const server = setupServer(
  ...authHandlers,
  ...adminHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...customerHandlers,
  ...pageHandlers,
  ...giftCardHandlers,
  ...mediaHandlers,
  ...quoteHandlers,
  ...companyHandlers,
  ...invoiceHandlers,
  ...collectionHandlers,
  ...blogHandlers,
)
