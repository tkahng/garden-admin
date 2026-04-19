import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Company = components["schemas"]["CompanyResponse"]
type PriceList = components["schemas"]["PriceListResponse"]
type PriceListEntry = components["schemas"]["PriceListEntryResponse"]
type CreatePriceList = components["schemas"]["CreatePriceListRequest"]
type UpdatePriceList = components["schemas"]["UpdatePriceListRequest"]
type UpsertEntry = components["schemas"]["UpsertPriceListEntryRequest"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleDateString() : "—"
}

function fmtDatetimeLocal(iso: string | undefined) {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 16)
}

function statusBadge(pl: PriceList) {
  const now = new Date()
  if (pl.endsAt && new Date(pl.endsAt) < now)
    return <Badge variant="secondary">Expired</Badge>
  if (pl.startsAt && new Date(pl.startsAt) > now)
    return <Badge variant="outline">Upcoming</Badge>
  return <Badge variant="default">Active</Badge>
}

// ─── Entry row form ───────────────────────────────────────────────────────────

function AddEntryRow({
  priceListId,
  onSuccess,
}: {
  priceListId: string
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [variantId, setVariantId] = useState("")
  const [price, setPrice] = useState("")
  const [minQty, setMinQty] = useState("1")

  const upsertMutation = useMutation({
    mutationFn: async (body: UpsertEntry) => {
      const { error } = await apiClient.PUT(
        "/api/v1/admin/price-lists/{id}/entries/{variantId}",
        {
          params: { path: { id: priceListId, variantId } },
          body,
        },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Entry saved")
      qc.invalidateQueries({ queryKey: ["admin", "price-list-entries", priceListId] })
      setVariantId("")
      setPrice("")
      setMinQty("1")
      onSuccess()
    },
    onError: () => toast.error("Failed to save entry"),
  })

  function handleSave() {
    if (!variantId.trim() || !price) {
      toast.error("Variant ID and price are required")
      return
    }
    upsertMutation.mutate({ price: Number(price), minQty: Number(minQty) || 1 })
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell>
        <Input
          placeholder="Variant UUID"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="h-7 text-xs font-mono"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          placeholder="1"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className="h-7 text-xs w-20"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-7 text-xs w-28"
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={upsertMutation.isPending}>
            Save
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Price list entries section ───────────────────────────────────────────────

function PriceListEntries({ priceListId }: { priceListId: string }) {
  const qc = useQueryClient()
  const [showAddRow, setShowAddRow] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "price-list-entries", priceListId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/price-lists/{id}/entries", {
        params: { path: { id: priceListId } },
      })
      if (error) throw error
      return (data as { data?: PriceListEntry[] } | undefined)?.data ?? []
    },
  })

  const entries = data ?? []

  const deleteMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await apiClient.DELETE(
        "/api/v1/admin/price-lists/{id}/entries/{variantId}",
        { params: { path: { id: priceListId, variantId } } },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Entry removed")
      qc.invalidateQueries({ queryKey: ["admin", "price-list-entries", priceListId] })
    },
    onError: () => toast.error("Failed to remove entry"),
  })

  return (
    <div className="border-t">
      <div className="px-4 py-3 bg-muted/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Variant ID</TableHead>
              <TableHead className="text-xs w-24">Min qty</TableHead>
              <TableHead className="text-xs w-32">Price</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-xs">
                  Loading entries…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && entries.length === 0 && !showAddRow && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-xs">
                  No entries yet.
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={`${e.variantId}-${e.minQty}`}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {e.variantId}
                </TableCell>
                <TableCell className="text-sm">
                  {e.minQty === 1 ? "Any" : `≥ ${e.minQty}`}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  ${(e.price ?? 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => e.variantId && deleteMutation.mutate(e.variantId)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {showAddRow && (
              <AddEntryRow
                priceListId={priceListId}
                onSuccess={() => setShowAddRow(false)}
              />
            )}
          </TableBody>
        </Table>
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setShowAddRow((v) => !v)}
          >
            <Plus className="size-3 mr-1" />
            Add entry
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Price list row ───────────────────────────────────────────────────────────

function PriceListRow({
  pl,
  companyId,
  onEdit,
  onDelete,
}: {
  pl: PriceList
  companyId: string
  onEdit: (pl: PriceList) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  void companyId

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpanded((v) => !v)}>
        <TableCell>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium">{pl.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{pl.currency ?? "USD"}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{pl.priority ?? 0}</TableCell>
        <TableCell>{statusBadge(pl)}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{fmt(pl.startsAt)}</TableCell>
        <TableCell className="text-muted-foreground text-sm">{fmt(pl.endsAt)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onEdit(pl)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive"
              onClick={() => pl.id && onDelete(pl.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="p-0">
            <PriceListEntries priceListId={pl.id!} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Price list dialog ────────────────────────────────────────────────────────

type PriceListFormState = Partial<CreatePriceList>

function PriceListDialog({
  open,
  onOpenChange,
  companyId,
  editing,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  companyId: string
  editing: PriceList | null
  onSuccess: () => void
}) {
  const [form, setForm] = useState<PriceListFormState>({ currency: "USD", priority: 0 })

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              currency: editing.currency ?? "USD",
              priority: editing.priority ?? 0,
              startsAt: editing.startsAt,
              endsAt: editing.endsAt,
            }
          : { currency: "USD", priority: 0 },
      )
    }
  }, [open, editing])

  const createMutation = useMutation({
    mutationFn: async (body: CreatePriceList) => {
      const { error } = await apiClient.POST("/api/v1/admin/price-lists", { body })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Price list created")
      onSuccess()
    },
    onError: () => toast.error("Failed to create price list"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePriceList }) => {
      const { error } = await apiClient.PUT("/api/v1/admin/price-lists/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Price list updated")
      onSuccess()
    },
    onError: () => toast.error("Failed to update price list"),
  })

  function handleSubmit() {
    if (!form.name?.trim()) {
      toast.error("Name is required")
      return
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id!,
        body: {
          name: form.name!,
          currency: form.currency ?? "USD",
          priority: form.priority ?? 0,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        },
      })
    } else {
      createMutation.mutate({
        companyId,
        name: form.name!,
        currency: form.currency ?? "USD",
        priority: form.priority ?? 0,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit price list" : "New price list"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Contract Pricing 2026"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                placeholder="USD"
                maxLength={3}
                value={form.currency ?? "USD"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.priority ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts at</Label>
              <Input
                type="datetime-local"
                value={fmtDatetimeLocal(form.startsAt)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    startsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ends at</Label>
              <Input
                type="datetime-local"
                value={fmtDatetimeLocal(form.endsAt)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    endsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Company detail page ──────────────────────────────────────────────────────

export function CompanyDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PriceList | null>(null)

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/companies/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return (data as { data?: Company } | undefined)?.data
    },
  })

  const { data: listsData, isLoading: listsLoading } = useQuery({
    queryKey: ["admin", "price-lists", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/price-lists", {
        params: { query: { companyId: id } },
      })
      if (error) throw error
      return (data as { data?: PriceList[] } | undefined)?.data ?? []
    },
  })

  const priceLists = listsData ?? []

  const deleteMutation = useMutation({
    mutationFn: async (plId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/price-lists/{id}", {
        params: { path: { id: plId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Price list deleted")
      qc.invalidateQueries({ queryKey: ["admin", "price-lists", id] })
    },
    onError: () => toast.error("Failed to delete price list"),
  })

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(pl: PriceList) {
    setEditing(pl)
    setDialogOpen(true)
  }

  function handleDialogSuccess() {
    setDialogOpen(false)
    qc.invalidateQueries({ queryKey: ["admin", "price-lists", id] })
  }

  const company = companyData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/companies" className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="size-3" />
          Companies
        </Link>
        {companyLoading ? (
          <div className="h-7 w-48 bg-muted animate-pulse rounded" />
        ) : (
          <h1 className="text-2xl font-semibold">{company?.name ?? "Company"}</h1>
        )}
        {company?.createdAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: {company.id} · Created {fmt(company.createdAt)}
          </p>
        )}
      </div>

      {/* Price lists section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Price lists</h2>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            New price list
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-20">Currency</TableHead>
                <TableHead className="w-20">Priority</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Starts</TableHead>
                <TableHead className="w-28">Ends</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listsLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!listsLoading && priceLists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No price lists yet.
                  </TableCell>
                </TableRow>
              )}
              {priceLists.map((pl) => (
                <PriceListRow
                  key={pl.id}
                  pl={pl}
                  companyId={id}
                  onEdit={openEdit}
                  onDelete={(plId) => deleteMutation.mutate(plId)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <PriceListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={id}
        editing={editing}
        onSuccess={handleDialogSuccess}
      />
    </div>
  )
}
