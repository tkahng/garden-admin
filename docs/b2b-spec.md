# B2B Feature Spec

**Status:** Retroactive — documents what is built and what remains  
**Last updated:** 2026-04-19

---

## Overview

The B2B system enables wholesale and enterprise purchasing through two surfaces:

- **Admin dashboard** (`garden-admin`) — staff manage companies, price agreements, quotes, and invoices
- **Customer portal** (`garden-web`) — company buyers submit quote requests, accept quotes, and track invoices

The core flow is: *company onboards → admin sets pricing → buyer requests quote → admin prices and sends → buyer accepts → invoice issued → admin records payments*.

---

## Entities

### Company

Represents an organisation that buys on B2B terms. A user can belong to multiple companies, each with a role.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | Display name |
| `taxId` | string | VAT / EIN (optional) |
| `phone` | string | |
| `billingAddress*` | strings | Full address fields |
| `createdAt` | datetime | |

**Membership roles:** OWNER · MANAGER · MEMBER  
- OWNER: full control including delete  
- MANAGER: can invite members, approve quotes  
- MEMBER: can submit quotes; may have a spending limit

**Invitations:** email-based, carry a role, expire, can be cancelled.

---

### Credit Account (Net Terms)

A company may have one credit account granting them a credit line instead of upfront payment.

| Field | Type | Notes |
|---|---|---|
| `creditLimit` | decimal | Maximum outstanding allowed |
| `outstandingBalance` | decimal | Currently owed |
| `availableCredit` | decimal | `creditLimit − outstandingBalance` |
| `paymentTermsDays` | int | e.g. 30 for NET-30 |
| `currency` | string | ISO-4217 |

When a buyer with net terms accepts a quote, an invoice is created rather than redirecting to checkout. The invoice draws on available credit.

---

### Price List

A named set of custom prices for a company, active within an optional date window.

| Field | Type | Notes |
|---|---|---|
| `companyId` | uuid | Belongs to one company |
| `name` | string | e.g. "Wholesale 2026" |
| `currency` | string | |
| `priority` | int | Higher value = applied first when multiple lists are active |
| `startsAt` / `endsAt` | datetime | Optional active window |

**Derived status:**
- **Active** — current date is within start/end (or no bounds set)
- **Upcoming** — start date is in the future
- **Expired** — end date has passed

**Entries** map a product variant to a price, optionally gated by a minimum quantity (for tiered pricing).

| Field | Type | Notes |
|---|---|---|
| `variantId` | uuid | Product variant |
| `price` | decimal | Unit price for this list |
| `minQty` | int | Minimum quantity to unlock this price (default 1) |

Multiple entries per variant at different `minQty` values create a tier structure.

---

### Quote

A negotiated purchase request that moves through a lifecycle before converting to an order or invoice.

**Lifecycle:**

```
PENDING → ASSIGNED → DRAFT → SENT → ACCEPTED → PAID
                                  ↘ REJECTED
                                  ↘ EXPIRED
         (any editable state) → CANCELLED
ACCEPTED (NET terms) → PENDING_APPROVAL → ACCEPTED (manager approved)
```

| Status | Who acts | What it means |
|---|---|---|
| PENDING | Admin | Just submitted, unassigned |
| ASSIGNED | Admin | Staff member claimed it |
| DRAFT | Admin | Staff is editing line items |
| SENT | Buyer | Admin sent to customer with expiry |
| ACCEPTED | System | Buyer accepted; order/invoice created |
| PENDING_APPROVAL | Manager | Buyer accepted but needs manager sign-off (net terms) |
| PAID | System | Full payment received |
| REJECTED | Buyer | Buyer declined |
| EXPIRED | System | `expiresAt` passed without acceptance |
| CANCELLED | Either | Manually cancelled |

**Editable states:** PENDING, ASSIGNED, DRAFT (admin can add/edit items, change staff notes)  
**Terminal states:** ACCEPTED, PAID, REJECTED, EXPIRED, CANCELLED (no mutations)

**Line items** carry a description, quantity, and unit price. Until the admin adds pricing, `unitPrice` is null and the buyer sees "Pending pricing".

---

### Invoice

A financial document issued when a quote is accepted on net terms, or (future) when an order is placed against a credit account.

**Statuses:** ISSUED → PARTIAL → PAID  (also: OVERDUE, VOID)

| Status | Meaning |
|---|---|
| ISSUED | Invoice sent, no payment received |
| PARTIAL | Some payments recorded, balance remains |
| PAID | Fully settled |
| OVERDUE | Admin marked past due date |
| VOID | Cancelled / written off |

**Payments** are recorded manually by admin staff (wire refs, cheque numbers, etc.).

| Field | Type | Notes |
|---|---|---|
| `amount` | decimal | Payment amount |
| `paymentReference` | string | Wire ref, cheque # |
| `paidAt` | datetime | When the payment was made |
| `notes` | string | Free-form |

---

## Admin Flows

### Companies

**List view** (`/companies`)
- Table of companies with name (link to detail) and created date
- "Add company" button — *route not yet implemented*

**Detail view** (`/companies/{id}`)
- Company name and ID
- Credit account section (see below)
- Price lists section (see below)

**Missing:** company edit (name, address, tax ID), company search, member management from admin side.

---

### Credit Account

Accessed from company detail.

**Setup (`POST /admin/credit-accounts`)**
- Enter credit limit, payment terms (days), currency
- Currency is locked after creation

**Edit (`PUT /admin/credit-accounts/company/{companyId}`)**
- Can update credit limit and payment terms

**Remove (`DELETE /admin/credit-accounts/company/{companyId}`)**
- Requires confirmation; outstanding balance must be settled first (enforcement is server-side)

---

### Price Lists

Accessible two ways:
1. **Within company detail** — scoped to that company
2. **Standalone `/price-lists`** — two-panel; left column lists companies, right column shows their price lists

**CRUD:**
- Create: name (required), currency, priority, start/end datetimes
- Edit: same fields
- Delete: permanent, with confirmation

**Entries (within an expanded price list row):**
- Add: paste variant UUID, set min qty and unit price
- Delete: remove a single entry

*Limitation: variant UUID must be entered manually; no product search picker.*

---

### Quotes

**List view** (`/quotes`)
- Table of all quotes; filterable by status
- Columns: short ID (link), status badge, customer email, assigned staff, date

**Detail view** (`/quotes/{id}`)

Left panel — items and notes:
- Line items table; editable when quote is in an editable state
  - Inline add row: description, qty, unit price
  - Edit (pencil) / delete per row
  - Running total
- Staff notes textarea (auto-saves when changed)
- Customer notes (read-only display)

Right panel — actions and metadata:
- **Send** (editable states): sets expiry datetime, transitions to SENT
- **Assign** (editable states): sets staff user ID
- **Cancel** (editable + SENT): transitions to CANCELLED
- Metadata: customer ID, company ID, assigned staff, expiry, linked order ID
- Delivery address and shipping requirements

---

### Invoices

**List view** (`/invoices`)
- Status tabs: All · Issued · Partial · Paid · Overdue · Void
- Filters: status dropdown, company ID text field
- Columns: short ID (link), company ID, status badge, total, outstanding, issued date, due date (red if overdue)

**Detail view** (`/invoices/{id}`)

Header: "INV-{8chars}", status badge, company link

Summary cards: Total · Paid · Outstanding

Metadata row: Issued date · Due date · Linked order ID · Linked quote ID

Overdue banner (if status = OVERDUE)

Payment history table: date · reference · amount · notes

**Actions:**
- **Record payment** (ISSUED / PARTIAL / OVERDUE): opens dialog for amount, reference, paid-at, notes
- **Mark overdue** (ISSUED / PARTIAL): transitions status
- **Void** (any except PAID or already VOID): transitions status, with confirmation

*Invoices cannot currently be created manually — they are only created by the system when a buyer accepts a quote on net terms.*

---

## Customer Portal Flows

### Company Onboarding (`/account/company`)

**No company:** form to create one (name, optional tax ID).

**Has company:** tabs for Members and Invitations (if OWNER or MANAGER).

**Members tab:**
- List members with name, email, role badge
- OWNER/MANAGER can:
  - Toggle role between MANAGER and MEMBER
  - Remove members

**Invitations tab (OWNER/MANAGER only):**
- List pending invitations (email, expiry, role, status)
- Cancel pending invitation
- Send new invitation: email + role (MEMBER / MANAGER)
- Error feedback: already a member (409), user not found (404)

---

### Quote Cart & Submission (`/account/quote-cart`)

Buyers build a quote cart by adding product variants from the storefront, then submit it as a formal request.

**Cart view:**
- Each item: variant ID, optional note, quantity (editable), remove button

**Submit form (shown when cart is non-empty):**
- Company selector (if user belongs to multiple companies)
- Delivery address: line 1, city, postal code, country (all required)
- Notes textarea (optional)
- Submit → creates quote in PENDING status → navigates to `/account/quotes/{id}`

---

### Quotes (`/account/quotes`)

**List view:**
- Created date, item count, status badge, "View →" link
- Paginated (10 per page)
- Status colour coding: blue (SENT), green (ACCEPTED/PAID), yellow (PENDING_APPROVAL), red (REJECTED/EXPIRED), muted (others)

**Detail view (`/account/quotes/{id}`):**
- Line items with pricing ("Pending pricing" when unitPrice is null)
- Total (shown only when all items are priced)
- Delivery address
- Expiry countdown (live timer when SENT, red < 1 day, yellow < 3 days)
- "Offer has expired" message when EXPIRED

**Actions:**
- **Accept** (SENT): calls acceptQuote
  - If NET terms → invoice created → may require manager approval (PENDING_APPROVAL)
  - If no NET terms → redirects to checkout URL
- **Cancel** (PENDING / ASSIGNED / DRAFT / SENT / PENDING_APPROVAL)
- **Download PDF** (if PDF has been generated)

---

### Pending Approvals (`/account/quotes/pending-approvals`)

Visible to MANAGER and OWNER roles.

Lists quotes in PENDING_APPROVAL state that need sign-off. Shows line items and total for each.

- **Approve**: quote moves to ACCEPTED, order/invoice proceeds
- **Reject**: quote moves to REJECTED

---

### Invoices (`/account/invoices`)

Requires company membership.

**List view:**
- All company invoices; each row links to detail
- Shows issued/due dates, total, outstanding amount, status badge
- "No invoices yet" empty state

**Detail view (`/account/invoices/{id}`):**
- Status badge, overdue banner if applicable
- Issued / due dates, total / paid / outstanding breakdown
- Link to source quote (if quoteId present)
- Payment history: date, amount, reference, notes

*Buyers cannot record payments — these are admin-only.*

---

## Open Items & Planned Work

### High priority

| # | Area | Description |
|---|---|---|
| 1 | Companies | Add `/companies/new` route with create form (name, tax ID, billing address) |
| 2 | Companies | Add company edit (name, tax ID, phone, billing address) from admin detail page |
| 3 | Companies | Add admin-side member management (list members, remove, change role) |
| 4 | Price Lists | Add variant search/picker instead of raw UUID input |
| 5 | Quotes | Add status filter dropdown on quotes list (currently just a text field) |
| 6 | Invoices | Allow manual invoice creation (not just auto-created from quote acceptance) |

### Medium priority

| # | Area | Description |
|---|---|---|
| 7 | Price Lists | Clone an existing price list (copy to same or different company) |
| 8 | Quotes | Trigger PDF generation and view from admin quote detail |
| 9 | Invoices | Send invoice email notification to buyer from admin |
| 10 | Companies | Companies list search (currently placeholder, not wired to API) |
| 11 | Companies | Show member count in companies list |

### Low priority / future

| # | Area | Description |
|---|---|---|
| 12 | Price Lists | Bulk import entries via CSV |
| 13 | Quotes | Clone quote |
| 14 | Invoices | Invoice PDF / print view from admin |
| 15 | Invoices | Duplicate payment detection warning |
| 16 | Portal | Spending limit display for MEMBER role users |
| 17 | Portal | Invoice PDF download in customer portal |
| 18 | Portal | Order link from invoice detail page in customer portal |

---

## Endpoint Reference

| Method | Path | What |
|---|---|---|
| GET | `/api/v1/companies` | List companies (storefront + admin) |
| GET | `/api/v1/companies/{id}` | Get company |
| POST | `/api/v1/companies` | Create company |
| GET | `/api/v1/companies/{id}/members` | List members |
| POST | `/api/v1/companies/{id}/members` | Add member by email |
| DELETE | `/api/v1/companies/{id}/members/{userId}` | Remove member |
| PUT | `/api/v1/companies/{id}/members/{userId}` | Update member role |
| GET | `/api/v1/companies/{id}/invitations` | List invitations |
| POST | `/api/v1/companies/{id}/invitations` | Send invitation |
| DELETE | `/api/v1/companies/{id}/invitations/{id}` | Cancel invitation |
| GET | `/api/v1/admin/credit-accounts/company/{id}` | Get credit account |
| POST | `/api/v1/admin/credit-accounts` | Create credit account |
| PUT | `/api/v1/admin/credit-accounts/company/{id}` | Update credit account |
| DELETE | `/api/v1/admin/credit-accounts/company/{id}` | Remove credit account |
| GET | `/api/v1/admin/price-lists` | List price lists (requires `companyId`) |
| POST | `/api/v1/admin/price-lists` | Create price list |
| PUT | `/api/v1/admin/price-lists/{id}` | Update price list |
| DELETE | `/api/v1/admin/price-lists/{id}` | Delete price list |
| GET | `/api/v1/admin/price-lists/{id}/entries` | List entries |
| PUT | `/api/v1/admin/price-lists/{id}/entries/{variantId}` | Upsert entry |
| DELETE | `/api/v1/admin/price-lists/{id}/entries/{variantId}` | Delete entry |
| GET | `/api/v1/admin/quotes` | List quotes |
| GET | `/api/v1/admin/quotes/{id}` | Get quote |
| POST | `/api/v1/admin/quotes/{id}/items` | Add item |
| PUT | `/api/v1/admin/quotes/{id}/items/{itemId}` | Update item |
| DELETE | `/api/v1/admin/quotes/{id}/items/{itemId}` | Delete item |
| POST | `/api/v1/admin/quotes/{id}/send` | Send to customer |
| POST | `/api/v1/admin/quotes/{id}/assign` | Assign staff |
| PUT | `/api/v1/admin/quotes/{id}/notes` | Update staff notes |
| POST | `/api/v1/admin/quotes/{id}/cancel` | Cancel quote |
| GET | `/api/v1/admin/invoices` | List invoices |
| GET | `/api/v1/admin/invoices/{id}` | Get invoice |
| POST | `/api/v1/admin/invoices/{id}/payments` | Record payment |
| POST | `/api/v1/admin/invoices/{id}/overdue` | Mark overdue |
| DELETE | `/api/v1/admin/invoices/{id}` | Void invoice |
