import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { ChevronRight, ChevronDown, Search, ArrowDownToLine, SlidersHorizontal, Package } from "lucide-react"
import { toast } from "sonner"

type Product = components["schemas"]["AdminProductResponse"]
type Variant = components["schemas"]["AdminVariantResponse"]
type InventoryLevel = components["schemas"]["InventoryLevelResponse"]
type InventoryTransaction = components["schemas"]["InventoryTransactionResponse"]
type Location = components["schemas"]["LocationResponse"]

const TX_PAGE_SIZE = 15

function fmtDate(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"
}

// ─── Receive dialog ───────────────────────────────────────────────────────────

function ReceiveDialog({
  variantId,
  locations,
  open,
  onOpenChange,
  onSuccess,
}: {
  variantId: string
  locations: Location[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "")
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST(
        "/api/v1/admin/inventory/variants/{variantId}/receive",
        { params: { path: { variantId } }, body: { locationId, quantity, note: note || undefined } },
      )
      if (error) throw error
    },
    onSuccess: () => { toast.success("Stock received"); setNote(""); onSuccess() },
    onError: () => toast.error("Failed to receive stock"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Receive stock</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id!}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="PO #, supplier…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !locationId}>
            <ArrowDownToLine className="size-4 mr-2" />
            Receive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Adjust dialog ────────────────────────────────────────────────────────────

function AdjustDialog({
  variantId,
  locations,
  open,
  onOpenChange,
  onSuccess,
}: {
  variantId: string
  locations: Location[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "")
  const [delta, setDelta] = useState<number>(0)
  const [reason, setReason] = useState<"RECEIVED" | "SOLD" | "ADJUSTED" | "RETURNED" | "DAMAGED">("ADJUSTED")
  const [note, setNote] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST(
        "/api/v1/admin/inventory/variants/{variantId}/adjust",
        { params: { path: { variantId } }, body: { locationId, delta, reason, note: note || undefined } },
      )
      if (error) throw error
    },
    onSuccess: () => { toast.success("Stock adjusted"); setNote(""); setDelta(0); onSuccess() },
    onError: () => toast.error("Failed to adjust stock"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Adjust stock</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id!}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Delta <span className="text-muted-foreground">(use negative to subtract)</span></Label>
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADJUSTED">Adjusted</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
                <SelectItem value="DAMAGED">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="Reason for adjustment…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !locationId}>
            <SlidersHorizontal className="size-4 mr-2" />
            Adjust
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Variant inventory panel ──────────────────────────────────────────────────

function VariantInventoryPanel({
  variant,
  productTitle,
  locations,
}: {
  variant: Variant
  productTitle: string
  locations: Location[]
}) {
  const qc = useQueryClient()
  const variantId = variant.id!
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [txPage, setTxPage] = useState(0)

  // Fulfillment settings state
  const [fulfillmentType, setFulfillmentType] = useState(variant.fulfillmentType ?? "IN_STOCK")
  const [inventoryPolicy, setInventoryPolicy] = useState(variant.inventoryPolicy ?? "DENY")
  const [leadTimeDays, setLeadTimeDays] = useState(variant.leadTimeDays ?? 0)
  const [fulfillmentEdited, setFulfillmentEdited] = useState(false)

  const { data: levelsData, isLoading: levelsLoading } = useQuery({
    queryKey: ["admin", "inventory", "levels", variantId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/admin/inventory/variants/{variantId}/levels",
        { params: { path: { variantId } } },
      )
      if (error) throw error
      return (data as { data?: InventoryLevel[] } | undefined)?.data ?? []
    },
  })

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["admin", "inventory", "transactions", variantId, txPage],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/admin/inventory/variants/{variantId}/transactions",
        { params: { path: { variantId }, query: { page: txPage, size: TX_PAGE_SIZE } } },
      )
      if (error) throw error
      return (data as { data?: { content?: InventoryTransaction[]; meta?: { total?: number } } } | undefined)?.data
    },
  })

  const fulfillmentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH(
        "/api/v1/admin/inventory/variants/{variantId}/fulfillment",
        {
          params: { path: { variantId } },
          body: { fulfillmentType: fulfillmentType as "IN_STOCK" | "PRE_ORDER" | "MADE_TO_ORDER", inventoryPolicy: inventoryPolicy as "DENY" | "CONTINUE", leadTimeDays },
        },
      )
      if (error) throw error
    },
    onSuccess: () => { toast.success("Fulfillment settings saved"); setFulfillmentEdited(false) },
    onError: () => toast.error("Failed to save fulfillment settings"),
  })

  function invalidateLevels() {
    void qc.invalidateQueries({ queryKey: ["admin", "inventory", "levels", variantId] })
    void qc.invalidateQueries({ queryKey: ["admin", "inventory", "transactions", variantId] })
  }

  const levels = levelsData ?? []
  const totalOnHand = levels.reduce((s, l) => s + (l.quantityOnHand ?? 0), 0)
  const totalCommitted = levels.reduce((s, l) => s + (l.quantityCommitted ?? 0), 0)
  const transactions = txData?.content ?? []
  const txTotal = txData?.meta?.total ?? 0
  const txTotalPages = Math.ceil(txTotal / TX_PAGE_SIZE) || 1

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">{productTitle}</p>
        <h2 className="text-lg font-semibold mt-0.5">{variant.title ?? "Default"}</h2>
        <div className="flex items-center gap-2 mt-1">
          {variant.sku && (
            <span className="font-mono text-xs text-muted-foreground">SKU: {variant.sku}</span>
          )}
          {variant.fulfillmentType && (
            <Badge variant="outline" className="text-xs">{variant.fulfillmentType}</Badge>
          )}
          {variant.inventoryPolicy && (
            <Badge variant="secondary" className="text-xs">{variant.inventoryPolicy}</Badge>
          )}
        </div>
      </div>

      {/* Stock levels */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Stock levels
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {totalOnHand} on hand · {totalCommitted} committed · {totalOnHand - totalCommitted} available
            </span>
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setReceiveOpen(true)}>
              <ArrowDownToLine className="size-3.5 mr-1.5" />
              Receive
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="size-3.5 mr-1.5" />
              Adjust
            </Button>
          </div>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levelsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!levelsLoading && levels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No stock levels. Receive stock to begin tracking.</TableCell>
                </TableRow>
              )}
              {levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="text-sm">{level.locationName ?? level.locationId?.slice(0, 8)}</TableCell>
                  <TableCell className="text-right text-sm">{level.quantityOnHand ?? 0}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{level.quantityCommitted ?? 0}</TableCell>
                  <TableCell className={cn(
                    "text-right text-sm font-medium",
                    (level.quantityOnHand ?? 0) - (level.quantityCommitted ?? 0) <= 0 ? "text-destructive" : ""
                  )}>
                    {(level.quantityOnHand ?? 0) - (level.quantityCommitted ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Fulfillment settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Fulfillment settings</h3>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fulfillment type</Label>
              <Select
                value={fulfillmentType}
                onValueChange={(v) => { setFulfillmentType(v as typeof fulfillmentType); setFulfillmentEdited(true) }}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_STOCK">In stock</SelectItem>
                  <SelectItem value="PRE_ORDER">Pre-order</SelectItem>
                  <SelectItem value="MADE_TO_ORDER">Made to order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Inventory policy</Label>
              <Select
                value={inventoryPolicy}
                onValueChange={(v) => { setInventoryPolicy(v as typeof inventoryPolicy); setFulfillmentEdited(true) }}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DENY">Deny when out of stock</SelectItem>
                  <SelectItem value="CONTINUE">Continue selling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lead time (days)</Label>
            <Input
              type="number"
              min={0}
              value={leadTimeDays}
              onChange={(e) => { setLeadTimeDays(Number(e.target.value)); setFulfillmentEdited(true) }}
              className="h-8 text-sm w-28"
            />
          </div>
          {fulfillmentEdited && (
            <Button size="sm" onClick={() => fulfillmentMutation.mutate()} disabled={fulfillmentMutation.isPending}>
              Save settings
            </Button>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Transaction history</h3>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!txLoading && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</TableCell>
                </TableRow>
              )}
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(tx.createdAt)}</TableCell>
                  <TableCell className="text-sm">{tx.locationName ?? tx.locationId?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{tx.reason ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right text-sm font-medium",
                    (tx.quantity ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                  )}>
                    {(tx.quantity ?? 0) >= 0 ? "+" : ""}{tx.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tx.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!txLoading && txTotalPages > 1 && (
            <DataPagination page={txPage} totalPages={txTotalPages} total={txTotal} label="transaction" onPageChange={setTxPage} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ReceiveDialog
        variantId={variantId}
        locations={locations}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        onSuccess={() => { setReceiveOpen(false); invalidateLevels() }}
      />
      <AdjustDialog
        variantId={variantId}
        locations={locations}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onSuccess={() => { setAdjustOpen(false); invalidateLevels() }}
      />
    </div>
  )
}

// ─── Product row (collapsible) ────────────────────────────────────────────────

function ProductRow({
  product,
  selectedVariantId,
  onSelectVariant,
}: {
  product: Product
  selectedVariantId: string | null
  onSelectVariant: (variant: Variant, product: Product) => void
}) {
  const variants = product.variants ?? []
  const hasSelected = variants.some((v) => v.id === selectedVariantId)
  const [open, setOpen] = useState(hasSelected)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
          "hover:bg-muted/40 text-left",
          hasSelected && "text-primary",
        )}
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate">{product.title}</span>
        <span className="text-xs text-muted-foreground">{variants.length}</span>
      </button>

      {open && (
        <div className="ml-4 border-l pl-3">
          {variants.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">No variants.</p>
          )}
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onSelectVariant(variant, product)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                selectedVariantId === variant.id
                  ? "bg-primary/8 text-primary font-medium"
                  : "hover:bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <Package className="size-3.5 shrink-0" />
              <span className="flex-1 truncate text-left">{variant.title ?? "Default"}</span>
              {variant.sku && (
                <span className="font-mono text-xs opacity-60">{variant.sku}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Inventory page ───────────────────────────────────────────────────────────

export function InventoryPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const PAGE_SIZE = 20

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin", "inventory", "products", page, search],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/products", {
        params: { query: { page, size: PAGE_SIZE, q: search || undefined } },
      })
      if (error) throw error
      return (data as { data?: { content?: Product[]; meta?: { total?: number } } } | undefined)?.data
    },
  })

  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/locations", {})
      if (error) throw error
      return (data as { data?: Location[] } | undefined)?.data ?? []
    },
  })

  const products = productsData?.content ?? []
  const total = productsData?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const locations = locationsData ?? []

  function handleSelectVariant(variant: Variant, product: Product) {
    setSelectedVariant(variant)
    setSelectedProduct(product)
  }

  return (
    <div className="flex h-full overflow-hidden -mx-6 -my-4">
      {/* Left: product/variant list */}
      <div className="w-72 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="p-3 border-b">
          <h1 className="text-base font-semibold mb-2">Inventory</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {productsLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!productsLoading && products.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No products found.</div>
          )}
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              selectedVariantId={selectedVariant?.id ?? null}
              onSelectVariant={handleSelectVariant}
            />
          ))}
        </div>

        {!productsLoading && totalPages > 1 && (
          <div className="border-t">
            <DataPagination page={page} totalPages={totalPages} total={total} label="product" onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Right: variant inventory detail */}
      {selectedVariant && selectedProduct ? (
        <VariantInventoryPanel
          key={selectedVariant.id}
          variant={selectedVariant}
          productTitle={selectedProduct.title ?? ""}
          locations={locations}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Select a variant to manage its inventory.
        </div>
      )}
    </div>
  )
}
