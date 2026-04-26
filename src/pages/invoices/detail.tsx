import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

type Invoice = components["schemas"]["InvoiceResponse"]
type InvoiceStatus = NonNullable<Invoice["status"]>
type RecordPayment = components["schemas"]["RecordPaymentRequest"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | undefined) {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—"
}

function fmtCurrency(amount: number | undefined, currency = "USD") {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function statusVariant(status: InvoiceStatus | undefined) {
  switch (status) {
    case "PAID": return "default" as const
    case "PARTIAL": return "secondary" as const
    case "ISSUED": return "outline" as const
    case "OVERDUE": return "destructive" as const
    case "VOID": return "secondary" as const
    default: return "outline" as const
  }
}

// ─── Record payment dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({
  invoiceId,
  open,
  onOpenChange,
  onSuccess,
}: {
  invoiceId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<Partial<RecordPayment>>({})

  const mutation = useMutation({
    mutationFn: async (body: RecordPayment) => {
      const { error } = await apiClient.POST("/api/v1/admin/invoices/{id}/payments", {
        params: { path: { id: invoiceId } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Payment recorded")
      setForm({})
      onSuccess()
    },
    onError: () => toast.error("Failed to record payment"),
  })

  function handleSubmit() {
    if (!form.amount || form.amount <= 0) {
      toast.error("Amount must be positive")
      return
    }
    mutation.mutate({ amount: form.amount, ...form } as RecordPayment)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              placeholder="0.00"
              value={form.amount ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment reference</Label>
            <Input
              placeholder="Wire ref, check #, etc."
              value={form.paymentReference ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Paid at</Label>
            <Input
              type="datetime-local"
              value={form.paidAt ? new Date(form.paidAt).toISOString().slice(0, 16) : ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  paidAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Invoice detail page ──────────────────────────────────────────────────────

export function InvoiceDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "invoice", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/invoices/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return (data as { data?: Invoice } | undefined)?.data
    },
  })

  const invoice = data

  const markOverdueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/invoices/{id}/overdue", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Invoice marked overdue")
      qc.invalidateQueries({ queryKey: ["admin", "invoice", id] })
    },
    onError: () => toast.error("Failed to update invoice"),
  })

  const voidMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.DELETE("/api/v1/admin/invoices/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Invoice voided")
      qc.invalidateQueries({ queryKey: ["admin", "invoice", id] })
    },
    onError: () => toast.error("Failed to void invoice"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div>
        <p className="text-muted-foreground">Invoice not found.</p>
        <Link to="/invoices" search={{}} className="text-sm underline mt-2 block">
          ← Back to invoices
        </Link>
      </div>
    )
  }

  const payments = invoice.payments ?? []
  const canMarkOverdue = invoice.status === "ISSUED" || invoice.status === "PARTIAL"
  const canVoid = invoice.status !== "VOID" && invoice.status !== "PAID"
  const canRecordPayment = invoice.status === "ISSUED" || invoice.status === "PARTIAL" || invoice.status === "OVERDUE"

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link to="/invoices" search={{}} className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" />
          Invoices
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono">INV-{id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {invoice.companyId && (
                <>
                  Company:{" "}
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: invoice.companyId }}
                    className="hover:underline"
                  >
                    {invoice.companyId.slice(0, 8)}…
                  </Link>
                  {" · "}
                </>
              )}
              Issued {fmt(invoice.issuedAt)}
            </p>
          </div>
          <Badge variant={statusVariant(invoice.status)}>
            {invoice.status?.toLowerCase()}
          </Badge>
        </div>
      </div>

      {/* Overdue warning */}
      {invoice.status === "OVERDUE" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          This invoice is overdue. Due date was {fmt(invoice.dueAt)}.
        </div>
      )}

      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-semibold">
              {fmtCurrency(invoice.totalAmount, invoice.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-semibold">
              {fmtCurrency(invoice.paidAmount, invoice.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-xl font-semibold ${invoice.outstandingAmount ? "text-destructive" : ""}`}>
              {invoice.status === "PAID"
                ? "—"
                : fmtCurrency(invoice.outstandingAmount, invoice.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <div className="rounded-lg border bg-card divide-y text-sm">
        {[
          ["Issued", fmt(invoice.issuedAt)],
          ["Due", fmt(invoice.dueAt)],
          invoice.orderId && ["Order", invoice.orderId],
          invoice.quoteId && ["Quote", invoice.quoteId],
        ]
          .filter(Boolean)
          .map(([label, value]) => (
            <div key={label as string} className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">{label as string}</span>
              <span className="font-mono text-xs">{value as string}</span>
            </div>
          ))}
      </div>

      {/* Payment history */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Payment history</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{fmt(p.paidAt ?? p.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.paymentReference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {fmtCurrency(p.amount, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canRecordPayment && (
          <Button onClick={() => setPaymentDialogOpen(true)}>
            Record payment
          </Button>
        )}
        {canMarkOverdue && (
          <Button
            variant="outline"
            onClick={() => markOverdueMutation.mutate()}
            disabled={markOverdueMutation.isPending}
          >
            Mark overdue
          </Button>
        )}
        {canVoid && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={() => setVoidConfirmOpen(true)}
          >
            Void invoice
          </Button>
        )}
      </div>

      <RecordPaymentDialog
        invoiceId={id}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={() => {
          setPaymentDialogOpen(false)
          qc.invalidateQueries({ queryKey: ["admin", "invoice", id] })
        }}
      />

      <AlertDialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the invoice as void. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setVoidConfirmOpen(false)
                voidMutation.mutate()
              }}
            >
              Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
