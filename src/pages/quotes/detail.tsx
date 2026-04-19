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
import { ArrowLeft, Pencil, Trash2, Plus, Send, UserCheck, Ban, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Quote = components["schemas"]["QuoteRequestResponse"]
type QuoteItem = components["schemas"]["QuoteItemResponse"]
type QuoteStatus = NonNullable<Quote["status"]>

function fmt(iso: string | undefined) {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—"
}

function fmtCurrency(amount: number | undefined) {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

function statusVariant(status: QuoteStatus | undefined) {
  switch (status) {
    case "PENDING": return "secondary" as const
    case "ASSIGNED": return "outline" as const
    case "DRAFT": return "outline" as const
    case "SENT": return "default" as const
    case "ACCEPTED": return "default" as const
    case "PAID": return "default" as const
    case "REJECTED": return "destructive" as const
    case "EXPIRED": return "destructive" as const
    case "CANCELLED": return "secondary" as const
    case "PENDING_APPROVAL": return "secondary" as const
    default: return "secondary" as const
  }
}

// ─── Send dialog ──────────────────────────────────────────────────────────────

function SendDialog({
  open,
  onOpenChange,
  onSend,
  isPending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSend: (expiresAt: string) => void
  isPending: boolean
}) {
  const defaultExpiry = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)
  const [expiresAt, setExpiresAt] = useState(defaultExpiry)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Send quote to customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Expiry date</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSend(new Date(expiresAt).toISOString())}
            disabled={isPending}
          >
            <Send className="size-4 mr-2" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Assign dialog ────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  onOpenChange,
  onAssign,
  isPending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAssign: (staffUserId: string) => void
  isPending: boolean
}) {
  const [staffUserId, setStaffUserId] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign staff member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Staff user ID</Label>
            <Input
              placeholder="UUID of staff user…"
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => { if (staffUserId.trim()) onAssign(staffUserId.trim()) }}
            disabled={isPending || !staffUserId.trim()}
          >
            <UserCheck className="size-4 mr-2" />
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add item row ─────────────────────────────────────────────────────────────

function AddItemRow({ onAdd, isPending }: {
  onAdd: (item: { description: string; quantity: number; unitPrice: number }) => void
  isPending: boolean
}) {
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState("")

  function handleAdd() {
    if (!description.trim()) { toast.error("Description required"); return }
    if (!unitPrice || Number(unitPrice) <= 0) { toast.error("Unit price must be positive"); return }
    onAdd({ description: description.trim(), quantity, unitPrice: Number(unitPrice) })
    setDescription("")
    setQuantity(1)
    setUnitPrice("")
  }

  return (
    <TableRow>
      <TableCell>
        <Input
          placeholder="Description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="h-8 text-sm w-20"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="h-8 text-sm w-28"
        />
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending} className="h-8">
          <Plus className="size-3.5 mr-1" />
          Add
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ─── Editable item row ────────────────────────────────────────────────────────

function ItemRow({ item, editable, onUpdate, onRemove, isPending }: {
  item: QuoteItem
  editable: boolean
  onUpdate: (id: string, quantity: number, unitPrice: number) => void
  onRemove: (id: string) => void
  isPending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(item.quantity ?? 1)
  const [price, setPrice] = useState(item.unitPrice ?? 0)

  if (editing) {
    return (
      <TableRow>
        <TableCell className="text-sm">{item.description ?? "—"}</TableCell>
        <TableCell>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-7 text-sm w-20"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="h-7 text-sm w-28"
          />
        </TableCell>
        <TableCell className="text-right text-sm font-medium">
          {fmtCurrency(qty * price)}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => { onUpdate(item.id!, qty, price); setEditing(false) }}
              disabled={isPending}
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setEditing(false)}
            >
              ×
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="text-sm">{item.description ?? "—"}</TableCell>
      <TableCell className="text-sm">{item.quantity}</TableCell>
      <TableCell className="text-sm">{fmtCurrency(item.unitPrice)}</TableCell>
      <TableCell className="text-right text-sm font-medium">
        {fmtCurrency((item.quantity ?? 0) * (item.unitPrice ?? 0))}
      </TableCell>
      <TableCell>
        {editable && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => onRemove(item.id!)}
              disabled={isPending}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

// ─── Quote detail page ────────────────────────────────────────────────────────

export function QuoteDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const [sendOpen, setSendOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [staffNotes, setStaffNotes] = useState("")
  const [notesEdited, setNotesEdited] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quote", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/quotes/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      const quote = (data as { data?: Quote } | undefined)?.data
      if (quote) setStaffNotes(quote.staffNotes ?? "")
      return quote
    },
  })

  const quote = data

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["admin", "quote", id] })
    void qc.invalidateQueries({ queryKey: ["admin", "quotes"] })
  }

  const sendMutation = useMutation({
    mutationFn: async (expiresAt: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/quotes/{id}/send", {
        params: { path: { id } },
        body: { expiresAt },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Quote sent"); setSendOpen(false); invalidate() },
    onError: () => toast.error("Failed to send quote"),
  })

  const assignMutation = useMutation({
    mutationFn: async (staffUserId: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/quotes/{id}/assign", {
        params: { path: { id } },
        body: { staffUserId },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Quote assigned"); setAssignOpen(false); invalidate() },
    onError: () => toast.error("Failed to assign quote"),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/api/v1/admin/quotes/{id}/cancel", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Quote cancelled"); setCancelOpen(false); invalidate() },
    onError: () => toast.error("Failed to cancel quote"),
  })

  const notesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await apiClient.PUT("/api/v1/admin/quotes/{id}/notes", {
        params: { path: { id } },
        body: { staffNotes: notes },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Notes saved"); setNotesEdited(false); invalidate() },
    onError: () => toast.error("Failed to save notes"),
  })

  const addItemMutation = useMutation({
    mutationFn: async (body: { description: string; quantity: number; unitPrice: number }) => {
      const { error } = await apiClient.POST("/api/v1/admin/quotes/{id}/items", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Item added"); invalidate() },
    onError: () => toast.error("Failed to add item"),
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity, unitPrice }: { itemId: string; quantity: number; unitPrice: number }) => {
      const { error } = await apiClient.PUT("/api/v1/admin/quotes/{id}/items/{itemId}", {
        params: { path: { id, itemId } },
        body: { quantity, unitPrice },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Item updated"); invalidate() },
    onError: () => toast.error("Failed to update item"),
  })

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/quotes/{id}/items/{itemId}", {
        params: { path: { id, itemId } },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Item removed"); invalidate() },
    onError: () => toast.error("Failed to remove item"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div>
        <p className="text-muted-foreground">Quote not found.</p>
        <Link to="/quotes" search={{}} className="text-sm underline mt-2 block">← Back to quotes</Link>
      </div>
    )
  }

  const status = quote.status
  const items = quote.items ?? []
  const total = items.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0)

  const canEdit = status === "PENDING" || status === "ASSIGNED" || status === "DRAFT"
  const canSend = canEdit
  const canAssign = canEdit
  const canCancel = canEdit || status === "SENT"
  const isTerminal = status === "ACCEPTED" || status === "PAID" || status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED"

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link to="/quotes" search={{}} className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" />
          Quotes
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono">QUO-{id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {fmt(quote.createdAt)}
              {quote.updatedAt && quote.updatedAt !== quote.createdAt && ` · Updated ${fmt(quote.updatedAt)}`}
            </p>
          </div>
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: items + notes */}
        <div className="col-span-2 space-y-6">

          {/* Line items */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Line items</h2>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && !canEdit && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No items.
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      editable={canEdit}
                      onUpdate={(itemId, qty, price) => updateItemMutation.mutate({ itemId, quantity: qty, unitPrice: price })}
                      onRemove={(itemId) => removeItemMutation.mutate(itemId)}
                      isPending={updateItemMutation.isPending || removeItemMutation.isPending}
                    />
                  ))}
                  {canEdit && (
                    <AddItemRow
                      onAdd={(item) => addItemMutation.mutate(item)}
                      isPending={addItemMutation.isPending}
                    />
                  )}
                </TableBody>
              </Table>
              {items.length > 0 && (
                <div className="flex justify-end px-4 py-3 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-4">Total</span>
                    <span className="font-semibold text-base">{fmtCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Staff notes */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Staff notes</h2>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <Textarea
                rows={4}
                placeholder="Internal notes visible only to staff…"
                value={staffNotes}
                onChange={(e) => { setStaffNotes(e.target.value); setNotesEdited(true) }}
                disabled={isTerminal}
                className="text-sm resize-none"
              />
              {notesEdited && (
                <Button
                  size="sm"
                  onClick={() => notesMutation.mutate(staffNotes)}
                  disabled={notesMutation.isPending}
                >
                  Save notes
                </Button>
              )}
            </div>
          </div>

          {/* Customer notes (read-only) */}
          {quote.customerNotes && (
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Customer notes</h2>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.customerNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: metadata + actions */}
        <div className="space-y-4">

          {/* Actions */}
          {!isTerminal && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Actions</p>
              {canSend && (
                <Button className="w-full" size="sm" onClick={() => setSendOpen(true)}>
                  <Send className="size-4 mr-2" />
                  Send to customer
                </Button>
              )}
              {canAssign && (
                <Button className="w-full" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                  <UserCheck className="size-4 mr-2" />
                  {quote.assignedStaffId ? "Reassign" : "Assign staff"}
                </Button>
              )}
              {canCancel && (
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban className="size-4 mr-2" />
                  Cancel quote
                </Button>
              )}
            </div>
          )}

          {/* Details */}
          <div className="rounded-lg border bg-card divide-y text-sm">
            {[
              quote.userId && ["Customer", <span key="u" className="font-mono text-xs">{quote.userId.slice(0, 8)}…</span>],
              quote.companyId && ["Company", (
                <Link key="c" to="/companies/$companyId" params={{ companyId: quote.companyId }} className="font-mono text-xs hover:underline">
                  {quote.companyId.slice(0, 8)}…
                </Link>
              )],
              quote.assignedStaffId && ["Assigned to", <span key="a" className="font-mono text-xs">{quote.assignedStaffId.slice(0, 8)}…</span>],
              quote.expiresAt && ["Expires", fmt(quote.expiresAt)],
              quote.orderId && ["Order", <span key="o" className="font-mono text-xs">{quote.orderId.slice(0, 8)}…</span>],
            ]
              .filter(Boolean)
              .map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span>{value as React.ReactNode}</span>
                </div>
              ))}
          </div>

          {/* Delivery address */}
          {quote.deliveryAddressLine1 && (
            <div className="rounded-lg border bg-card p-4 space-y-1 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Delivery address</p>
              <p>{quote.deliveryAddressLine1}</p>
              {quote.deliveryAddressLine2 && <p>{quote.deliveryAddressLine2}</p>}
              <p>
                {[quote.deliveryCity, quote.deliveryState, quote.deliveryPostalCode].filter(Boolean).join(", ")}
              </p>
              {quote.deliveryCountry && <p>{quote.deliveryCountry}</p>}
              {quote.shippingRequirements && (
                <p className="text-muted-foreground text-xs mt-2 pt-2 border-t">{quote.shippingRequirements}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSend={(expiresAt) => sendMutation.mutate(expiresAt)}
        isPending={sendMutation.isPending}
      />

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssign={(staffUserId) => assignMutation.mutate(staffUserId)}
        isPending={assignMutation.isPending}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the quote. The customer will no longer be able to accept it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep quote</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelMutation.mutate()}
            >
              Cancel quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
