import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataPagination } from "@/components/ui/data-pagination"
import { cn } from "@/lib/utils"

type Invoice = components["schemas"]["InvoiceResponse"]
type InvoiceStatus = NonNullable<Invoice["status"]>

const PAGE_SIZE = 20

const STATUS_TABS: { label: string; value: InvoiceStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Issued", value: "ISSUED" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Void", value: "VOID" },
]

function statusVariant(status: InvoiceStatus | undefined) {
  switch (status) {
    case "PAID": return "default"
    case "PARTIAL": return "secondary"
    case "ISSUED": return "outline"
    case "OVERDUE": return "destructive"
    case "VOID": return "secondary"
    default: return "outline"
  }
}

function fmt(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleDateString() : "—"
}

function fmtCurrency(amount: number | undefined, currency = "USD") {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

export function InvoicesPage() {
  const { page: rawPage, status, companyId } = useSearch({ from: "/_authenticated/invoices" })
  const page = rawPage ?? 0
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "invoices", page, status, companyId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/invoices", {
        params: {
          query: {
            page,
            size: PAGE_SIZE,
            status: (status as InvoiceStatus) || undefined,
            companyId: companyId || undefined,
          },
        },
      })
      if (error) throw error
      return (data as { data?: { content?: Invoice[]; meta?: { total?: number } } } | undefined)?.data
    },
  })

  const invoices: Invoice[] = data?.content ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(p: number) {
    void navigate({ to: "/invoices", search: { page: p, status, companyId }, replace: true })
  }

  function setStatus(s: string | undefined) {
    void navigate({ to: "/invoices", search: { page: 0, status: s, companyId }, replace: true })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Invoices</h1>

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              status === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter by company ID…"
          className="max-w-xs"
          value={companyId ?? ""}
          onChange={(e) =>
            void navigate({
              to: "/invoices",
              search: { page: 0, status, companyId: e.target.value || undefined },
              replace: true,
            })
          }
        />
        <Select
          value={status ?? ""}
          onValueChange={(v) => setStatus(v || undefined)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => (
              <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/30">
                <TableCell>
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: inv.id! }}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {inv.id?.slice(0, 8)}…
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {inv.companyId?.slice(0, 8)}…
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(inv.status)}>
                    {inv.status?.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {fmtCurrency(inv.totalAmount, inv.currency)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {inv.status === "PAID" ? (
                    <span className="text-muted-foreground">Paid</span>
                  ) : (
                    fmtCurrency(inv.outstandingAmount, inv.currency)
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmt(inv.issuedAt)}</TableCell>
                <TableCell className={cn(
                  "text-sm",
                  inv.status === "OVERDUE" ? "text-destructive font-medium" : "text-muted-foreground",
                )}>
                  {fmt(inv.dueAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="invoice" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
