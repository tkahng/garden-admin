# Garden Admin

Internal admin panel for the Garden e-commerce platform.

## Stack

- **React 19** · TypeScript · Vite
- **TanStack Router** (file-based routing) · **TanStack Query**
- **Tailwind CSS** · **shadcn/ui** components
- **openapi-fetch** for typed API calls against the Garden backend
- **Vitest** · **@testing-library/react** · **MSW** for testing

## What's in it

**Orders**
- Order list with status, date, and customer filters
- Order detail: fulfillment creation and status updates, event timeline, refunds, invoice generation

**Products**
- Product and variant management, collections, inventory levels by location
- Location CRUD (create, edit, deactivate, reactivate)

**B2B**
- Company list and detail: credit accounts, price lists with adjustment rules, product catalogs, shipping addresses, member list with invite-by-email, spending limits, tax exemption, sales rep assignment
- Quote lifecycle: assign, price line items, send PDF, approve/reject
- Invoice list and detail with payment recording and PDF download
- Return requests: approve, reject, complete with staff notes and order link

**Customers**
- Customer list with status filtering and bulk actions
- Customer detail: order history, roles, tags, admin notes

**Other**
- Discounts: percentage and fixed-amount codes
- Gift cards: issue, adjust balance, deactivate
- Analytics dashboard: revenue trends, order counts, top stats
- Content: blog posts, static pages, media library
- Settings: shipping zones and rates, user permissions, outbound webhooks with delivery history

## Running locally

```bash
npm install
npm run dev        # runs on port 5173
```

Requires the Garden backend running on port 8080. Set `VITE_API_URL` in `.env.local` if the backend is elsewhere.

## Tests

```bash
npm test           # type-check + vitest
```

136 tests covering page components, auth flows, and API interactions.

## Generating the API schema

```bash
npm run generate:schema   # requires backend running on :8080
```
