import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Pencil, Power } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type GiftCard = components["schemas"]["GiftCardResponse"]
type Transaction = components["schemas"]["GiftCardTransactionResponse"]

function fmt(iso: string | undefined) {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—"
}

function fmtCurrency(amount: number | undefined, currency = "USD") {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  card,
  open,
  onOpenChange,
  onSuccess,
}: {
  card: GiftCard
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [recipientEmail, setRecipientEmail] = useState("")
  const [note, setNote] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  useEffect(() => {
    if (open) {
      setRecipientEmail(card.recipientEmail ?? "")
      setNote(card.note ?? "")
      setExpiresAt(card.expiresAt ? new Date(card.expiresAt).toISOString().slice(0, 16) : "")
    }
  }, [open, card])

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/gift-cards/{id}", {
        params: { path: { id: card.id! } },
        body: {
          recipientEmail: recipientEmail || undefined,
          note: note || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Gift card updated"); onSuccess() },
    onError: () => toast.error("Failed to update gift card"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Edit gift card</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Recipient email</Label>
            <Input
              type="email"
              placeholder="customer@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expires at</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Adjust balance dialog ────────────────────────────────────────────────────

function AdjustDialog({
  cardId,
  open,
  onOpenChange,
  onSuccess,
}: {
  cardId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [delta, setDelta] = useState<number>(0)
  const [note, setNote] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/gift-cards/{id}/transactions", {
        params: { path: { id: cardId } },
        body: { delta, note: note || undefined },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Balance adjusted")
      setDelta(0)
      setNote("")
      onSuccess()
    },
    onError: () => toast.error("Failed to adjust balance"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Adjust balance</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Amount <span className="text-muted-foreground text-xs">(negative to subtract)</span></Label>
            <Input
              type="number"
              step="0.01"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="Reason for adjustment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || delta === 0}>
            Adjust
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Gift card detail page ────────────────────────────────────────────────────

export function GiftCardDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const { data: cardData, isLoading } = useQuery({
    queryKey: ["admin", "gift-card", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/gift-cards/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return (data as { data?: GiftCard } | undefined)?.data
    },
  })

  const { data: txData } = useQuery({
    queryKey: ["admin", "gift-card", id, "transactions"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/gift-cards/{id}/transactions", {
        params: { path: { id } },
      })
      if (error) throw error
      return (data as { data?: Transaction[] } | undefined)?.data ?? []
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/gift-cards/{id}/deactivate", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Gift card deactivated")
      setDeactivateOpen(false)
      void qc.invalidateQueries({ queryKey: ["admin", "gift-card", id] })
      void qc.invalidateQueries({ queryKey: ["admin", "gift-cards"] })
    },
    onError: () => toast.error("Failed to deactivate"),
  })

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["admin", "gift-card", id] })
    void qc.invalidateQueries({ queryKey: ["admin", "gift-card", id, "transactions"] })
    void qc.invalidateQueries({ queryKey: ["admin", "gift-cards"] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        <div className="h-40 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  const card = cardData
  if (!card) {
    return (
      <div>
        <p className="text-muted-foreground">Gift card not found.</p>
        <Link to="/gift-cards" search={{}} className="text-sm underline mt-2 block">← Back to gift cards</Link>
      </div>
    )
  }

  const transactions: Transaction[] = txData ?? []
  const totalUsed = (card.initialBalance ?? 0) - (card.currentBalance ?? 0)
  const isExpired = card.expiresAt ? new Date(card.expiresAt) < new Date() : false

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link to="/gift-cards" search={{}} className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" />
          Gift cards
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono">{card.code}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Created {fmt(card.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={card.isActive && !isExpired ? "default" : "secondary"}>
              {!card.isActive ? "Inactive" : isExpired ? "Expired" : "Active"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
            {card.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDeactivateOpen(true)}
              >
                <Power className="size-3.5 mr-1.5" />
                Deactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Initial</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-semibold">{fmtCurrency(card.initialBalance, card.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current balance</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={cn("text-xl font-semibold", (card.currentBalance ?? 0) === 0 && "text-muted-foreground")}>
              {fmtCurrency(card.currentBalance, card.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Used</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-semibold">{fmtCurrency(totalUsed, card.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <div className="rounded-lg border bg-card divide-y text-sm">
        {[
          card.recipientEmail && ["Recipient", card.recipientEmail],
          card.purchaserUserId && ["Purchaser", <span key="p" className="font-mono text-xs">{card.purchaserUserId.slice(0, 8)}…</span>],
          ["Expires", card.expiresAt ? fmt(card.expiresAt) : "No expiry"],
          card.note && ["Note", card.note],
        ]
          .filter(Boolean)
          .map(([label, value]) => (
            <div key={String(label)} className="flex justify-between items-center px-4 py-3">
              <span className="text-muted-foreground">{label as string}</span>
              <span>{value as React.ReactNode}</span>
            </div>
          ))}
      </div>

      {/* Transaction history */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Transaction history</h2>
          <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
            Adjust balance
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm text-muted-foreground">{fmt(tx.createdAt)}</TableCell>
                  <TableCell className={cn(
                    "text-right text-sm font-medium",
                    (tx.delta ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive",
                  )}>
                    {(tx.delta ?? 0) >= 0 ? "+" : ""}{fmtCurrency(tx.delta, card.currency)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {tx.orderId ? `${tx.orderId.slice(0, 8)}…` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tx.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <EditDialog
        card={card}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => { setEditOpen(false); invalidate() }}
      />

      <AdjustDialog
        cardId={id}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onSuccess={() => { setAdjustOpen(false); invalidate() }}
      />

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {card.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              The gift card will no longer be usable. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateMutation.mutate()}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
