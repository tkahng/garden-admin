import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

type Product = components["schemas"]["AdminProductResponse"]
type ProductOption = components["schemas"]["ProductOptionResponse"]
type ProductOptionValue = components["schemas"]["ProductOptionValueResponse"]
type Variant = components["schemas"]["AdminVariantResponse"]
type CreateVariant = components["schemas"]["CreateVariantRequest"]
type UpdateVariant = components["schemas"]["UpdateVariantRequest"]
type UpdateProduct = components["schemas"]["UpdateProductRequest"]

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const
const FULFILLMENT_TYPES = ["IN_STOCK", "PRE_ORDER", "MADE_TO_ORDER"] as const
const INVENTORY_POLICIES = ["DENY", "CONTINUE"] as const
const WEIGHT_UNITS = ["kg", "g", "lb", "oz"]

function statusVariant(status: string | undefined) {
  switch (status) {
    case "ACTIVE": return "default"
    case "DRAFT": return "secondary"
    case "ARCHIVED": return "outline"
    default: return "secondary"
  }
}

export function ProductDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()

  // Product info edit
  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState<UpdateProduct>({})

  // Variant dialog
  const [variantOpen, setVariantOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [variantForm, setVariantForm] = useState<CreateVariant & UpdateVariant>({})
  const [deleteVariant, setDeleteVariant] = useState<Variant | null>(null)

  // Option dialogs
  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const [newOptionName, setNewOptionName] = useState("")
  const [renameOption, setRenameOption] = useState<ProductOption | null>(null)
  const [renameOptionName, setRenameOptionName] = useState("")
  const [deleteOption, setDeleteOption] = useState<ProductOption | null>(null)

  // Option value dialogs
  const [addValueOpt, setAddValueOpt] = useState<ProductOption | null>(null)
  const [newValueLabel, setNewValueLabel] = useState("")
  const [renameValue, setRenameValue] = useState<{ opt: ProductOption; val: ProductOptionValue } | null>(null)
  const [renameValueLabel, setRenameValueLabel] = useState("")
  const [deleteValue, setDeleteValue] = useState<{ opt: ProductOption; val: ProductOptionValue } | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "products", id] })

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin", "products", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/products/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return data?.data
    },
    enabled: !!id,
  })

  // ── Product mutations ──────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async (body: UpdateProduct) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/products/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Product updated"); invalidate(); setEditInfo(false) },
    onError: () => toast.error("Failed to update product"),
  })

  const statusMutation = useMutation({
    mutationFn: async (status: "DRAFT" | "ACTIVE" | "ARCHIVED") => {
      const { error } = await apiClient.PATCH("/api/v1/admin/products/{id}/status", {
        params: { path: { id } },
        body: { status },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Status updated"); invalidate() },
    onError: () => toast.error("Failed to update status"),
  })

  // ── Variant mutations ──────────────────────────────────────────────────────

  const createVariantMutation = useMutation({
    mutationFn: async (body: CreateVariant) => {
      const { error } = await apiClient.POST("/api/v1/admin/products/{id}/variants", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Variant added"); invalidate()
      setVariantOpen(false); setVariantForm({})
    },
    onError: () => toast.error("Failed to add variant"),
  })

  const updateVariantMutation = useMutation({
    mutationFn: async ({ vId, body }: { vId: string; body: UpdateVariant }) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/products/{id}/variants/{vId}", {
        params: { path: { id, vId } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Variant updated"); invalidate()
      setVariantOpen(false); setEditingVariant(null); setVariantForm({})
    },
    onError: () => toast.error("Failed to update variant"),
  })

  const deleteVariantMutation = useMutation({
    mutationFn: async (vId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/products/{id}/variants/{vId}", {
        params: { path: { id, vId } },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Variant deleted"); invalidate(); setDeleteVariant(null) },
    onError: () => toast.error("Failed to delete variant"),
  })

  // ── Option mutations ───────────────────────────────────────────────────────

  const createOptionMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/products/{id}/options", {
        params: { path: { id } },
        body: { name },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Option added"); invalidate()
      setAddOptionOpen(false); setNewOptionName("")
    },
    onError: () => toast.error("Failed to add option"),
  })

  const renameOptionMutation = useMutation({
    mutationFn: async ({ optId, name }: { optId: string; name: string }) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/products/{id}/options/{optId}", {
        params: { path: { id, optId } },
        body: { name },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Option renamed"); invalidate(); setRenameOption(null)
    },
    onError: () => toast.error("Failed to rename option"),
  })

  const deleteOptionMutation = useMutation({
    mutationFn: async (optId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/products/{id}/options/{optId}", {
        params: { path: { id, optId } },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Option deleted"); invalidate(); setDeleteOption(null) },
    onError: () => toast.error("Failed to delete option"),
  })

  // ── Option value mutations ─────────────────────────────────────────────────

  const createOptionValueMutation = useMutation({
    mutationFn: async ({ optId, label }: { optId: string; label: string }) => {
      const { error } = await apiClient.POST("/api/v1/admin/products/{id}/options/{optId}/values", {
        params: { path: { id, optId } },
        body: { label },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Value added"); invalidate()
      setAddValueOpt(null); setNewValueLabel("")
    },
    onError: () => toast.error("Failed to add value"),
  })

  const renameOptionValueMutation = useMutation({
    mutationFn: async ({ optId, valId, label }: { optId: string; valId: string; label: string }) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/products/{id}/options/{optId}/values/{valId}", {
        params: { path: { id, optId, valId } },
        body: { label },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Value renamed"); invalidate(); setRenameValue(null)
    },
    onError: () => toast.error("Failed to rename value"),
  })

  const deleteOptionValueMutation = useMutation({
    mutationFn: async ({ optId, valId }: { optId: string; valId: string }) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/products/{id}/options/{optId}/values/{valId}", {
        params: { path: { id, optId, valId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Value deleted"); invalidate(); setDeleteValue(null)
    },
    onError: () => toast.error("Failed to delete value"),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openAddVariant() {
    setEditingVariant(null)
    setVariantForm({})
    setVariantOpen(true)
  }

  function openEditVariant(v: Variant) {
    setEditingVariant(v)
    setVariantForm({
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? undefined,
      sku: v.sku ?? "",
      barcode: v.barcode ?? "",
      weight: v.weight ?? undefined,
      weightUnit: v.weightUnit ?? "",
      fulfillmentType: v.fulfillmentType,
      inventoryPolicy: v.inventoryPolicy,
      leadTimeDays: v.leadTimeDays,
    })
    setVariantOpen(true)
  }

  function handleVariantSave() {
    if (editingVariant?.id) {
      updateVariantMutation.mutate({ vId: editingVariant.id, body: variantForm })
    } else {
      createVariantMutation.mutate(variantForm as CreateVariant)
    }
  }

  function openEditInfo() {
    const p = product as Product
    setInfoForm({
      title: p.title,
      description: p.description,
      handle: p.handle,
      vendor: p.vendor,
      productType: p.productType,
      tags: p.tags,
    })
    setEditInfo(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <div className="text-muted-foreground p-4">Loading...</div>
  if (!product) return <div className="text-muted-foreground p-4">Product not found</div>

  const p = product as Product
  const variants: Variant[] = (p.variants ?? []) as Variant[]
  const options: ProductOption[] = (p.options ?? []) as ProductOption[]
  const images = p.images ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/products"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{p.title ?? "Untitled"}</h1>
          <p className="text-sm text-muted-foreground">{p.handle ?? ""}</p>
        </div>
        <Badge variant={statusVariant(p.status)}>{p.status ?? "DRAFT"}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Product info */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Product details</CardTitle>
              <Button variant="ghost" size="sm" onClick={openEditInfo}>
                <Pencil className="size-3.5 mr-1.5" />Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-y-2">
                <span className="text-muted-foreground">Title</span>
                <span>{p.title ?? "—"}</span>
                <span className="text-muted-foreground">Handle</span>
                <span className="font-mono text-xs">{p.handle ?? "—"}</span>
                <span className="text-muted-foreground">Vendor</span>
                <span>{p.vendor ?? "—"}</span>
                <span className="text-muted-foreground">Type</span>
                <span>{p.productType ?? "—"}</span>
                {(p.tags ?? []).length > 0 && (
                  <>
                    <span className="text-muted-foreground">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {(p.tags ?? []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {p.description && (
                <p className="text-muted-foreground mt-2 leading-relaxed">{p.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Options</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setAddOptionOpen(true)}>
                <Plus className="size-3.5 mr-1.5" />Add option
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No options yet. Add options like Color or Size to create variants.
                </p>
              ) : (
                options.map((opt) => (
                  <div key={opt.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{opt.name}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => { setRenameOption(opt); setRenameOptionName(opt.name ?? "") }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-destructive"
                          onClick={() => setDeleteOption(opt)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(opt.values ?? []).map((val) => (
                        <div
                          key={val.id}
                          className="flex items-center gap-0.5 bg-secondary text-secondary-foreground rounded px-2 py-0.5 text-xs group"
                        >
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => { setRenameValue({ opt, val }); setRenameValueLabel(val.label ?? "") }}
                          >
                            {val.label}
                          </span>
                          <button
                            className="ml-0.5 opacity-50 group-hover:opacity-100 hover:text-destructive"
                            onClick={() => setDeleteValue({ opt, val })}
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => { setAddValueOpt(opt); setNewValueLabel("") }}
                      >
                        <Plus className="size-3 mr-0.5" />Add value
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Variants ({variants.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={openAddVariant}>
                <Plus className="size-3.5 mr-1.5" />Add variant
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 pb-6">No variants yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title / Options</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium">{v.title ?? "Default"}</div>
                          {(v.optionValues ?? []).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {(v.optionValues ?? []).map((ov) => ov.valueLabel).join(" / ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {v.sku ?? "—"}
                        </TableCell>
                        <TableCell>
                          {v.price != null ? `$${Number(v.price).toFixed(2)}` : "—"}
                          {v.compareAtPrice != null && (
                            <span className="ml-2 text-xs text-muted-foreground line-through">
                              ${Number(v.compareAtPrice).toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {v.fulfillmentType ?? "IN_STOCK"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="size-7"
                              onClick={() => openEditVariant(v)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="size-7 text-destructive"
                              onClick={() => setDeleteVariant(v)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={p.status ?? "DRAFT"}
                onValueChange={(v) => statusMutation.mutate(v as "DRAFT" | "ACTIVE" | "ARCHIVED")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {p.status === "ACTIVE" ? "Visible in storefront"
                  : p.status === "ARCHIVED" ? "Hidden, not available for new orders"
                  : "Not published yet"}
              </p>
            </CardContent>
          </Card>

          {/* Images */}
          {images.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Images ({images.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="aspect-square rounded-md overflow-hidden border bg-muted">
                      {img.url ? (
                        <img src={img.url} alt={img.altText ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{String(p.id ?? "").slice(0, 8)}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Edit product info */}
      <Dialog open={editInfo} onOpenChange={setEditInfo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit product details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={infoForm.title ?? ""}
                onChange={(e) => setInfoForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={infoForm.description ?? ""}
                onChange={(e) => setInfoForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Handle</Label>
                <Input
                  value={infoForm.handle ?? ""}
                  onChange={(e) => setInfoForm((f) => ({ ...f, handle: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input
                  value={infoForm.vendor ?? ""}
                  onChange={(e) => setInfoForm((f) => ({ ...f, vendor: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Product type</Label>
              <Input
                value={infoForm.productType ?? ""}
                onChange={(e) => setInfoForm((f) => ({ ...f, productType: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={(infoForm.tags ?? []).join(", ")}
                onChange={(e) =>
                  setInfoForm((f) => ({
                    ...f,
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInfo(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate(infoForm)} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add option */}
      <Dialog open={addOptionOpen} onOpenChange={setAddOptionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add option</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Option name</Label>
              <Input
                placeholder="e.g. Color, Size"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newOptionName.trim() && createOptionMutation.mutate(newOptionName.trim())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOptionOpen(false)}>Cancel</Button>
            <Button
              onClick={() => newOptionName.trim() && createOptionMutation.mutate(newOptionName.trim())}
              disabled={createOptionMutation.isPending || !newOptionName.trim()}
            >Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename option */}
      <Dialog open={!!renameOption} onOpenChange={(o) => !o && setRenameOption(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Rename option</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Option name</Label>
              <Input
                value={renameOptionName}
                onChange={(e) => setRenameOptionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOption(null)}>Cancel</Button>
            <Button
              onClick={() => renameOption?.id && renameOptionName.trim() &&
                renameOptionMutation.mutate({ optId: renameOption.id, name: renameOptionName.trim() })}
              disabled={renameOptionMutation.isPending || !renameOptionName.trim()}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete option confirm */}
      <AlertDialog open={!!deleteOption} onOpenChange={(o) => !o && setDeleteOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete option "{deleteOption?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the option and all its values. Variants using these values will be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOption?.id && deleteOptionMutation.mutate(deleteOption.id)}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add option value */}
      <Dialog open={!!addValueOpt} onOpenChange={(o) => !o && setAddValueOpt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add value to "{addValueOpt?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                placeholder="e.g. Red, Large"
                value={newValueLabel}
                onChange={(e) => setNewValueLabel(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && newValueLabel.trim() && addValueOpt?.id &&
                  createOptionValueMutation.mutate({ optId: addValueOpt.id, label: newValueLabel.trim() })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddValueOpt(null)}>Cancel</Button>
            <Button
              onClick={() => newValueLabel.trim() && addValueOpt?.id &&
                createOptionValueMutation.mutate({ optId: addValueOpt.id, label: newValueLabel.trim() })}
              disabled={createOptionValueMutation.isPending || !newValueLabel.trim()}
            >Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename option value */}
      <Dialog open={!!renameValue} onOpenChange={(o) => !o && setRenameValue(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                value={renameValueLabel}
                onChange={(e) => setRenameValueLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameValue(null)}>Cancel</Button>
            <Button
              onClick={() => renameValue && renameValueLabel.trim() &&
                renameOptionValueMutation.mutate({
                  optId: renameValue.opt.id!,
                  valId: renameValue.val.id!,
                  label: renameValueLabel.trim(),
                })}
              disabled={renameOptionValueMutation.isPending || !renameValueLabel.trim()}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete option value confirm */}
      <AlertDialog open={!!deleteValue} onOpenChange={(o) => !o && setDeleteValue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete value "{deleteValue?.val.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the value from all variants using it and update their titles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteValue &&
                deleteOptionValueMutation.mutate({
                  optId: deleteValue.opt.id!,
                  valId: deleteValue.val.id!,
                })}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variant dialog (add / edit) */}
      <Dialog
        open={variantOpen}
        onOpenChange={(o) => {
          setVariantOpen(o)
          if (!o) { setEditingVariant(null); setVariantForm({}) }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit variant" : "Add variant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={variantForm.price ?? ""}
                  onChange={(e) => setVariantForm((f) => ({ ...f, price: Number(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Compare-at price ($)</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={variantForm.compareAtPrice ?? ""}
                  onChange={(e) =>
                    setVariantForm((f) => ({ ...f, compareAtPrice: Number(e.target.value) || undefined }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  value={variantForm.sku ?? ""}
                  onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode</Label>
                <Input
                  value={variantForm.barcode ?? ""}
                  onChange={(e) => setVariantForm((f) => ({ ...f, barcode: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Weight</Label>
                <Input
                  type="number" min={0}
                  value={variantForm.weight ?? ""}
                  onChange={(e) => setVariantForm((f) => ({ ...f, weight: Number(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Weight unit</Label>
                <Select
                  value={variantForm.weightUnit ?? "kg"}
                  onValueChange={(v) => setVariantForm((f) => ({ ...f, weightUnit: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEIGHT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fulfillment type</Label>
                <Select
                  value={variantForm.fulfillmentType ?? "IN_STOCK"}
                  onValueChange={(v) =>
                    setVariantForm((f) => ({ ...f, fulfillmentType: v as typeof FULFILLMENT_TYPES[number] }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_TYPES.map((ft) => (
                      <SelectItem key={ft} value={ft}>
                        {ft.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Inventory policy</Label>
                <Select
                  value={variantForm.inventoryPolicy ?? "DENY"}
                  onValueChange={(v) =>
                    setVariantForm((f) => ({ ...f, inventoryPolicy: v as typeof INVENTORY_POLICIES[number] }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DENY">Deny when out of stock</SelectItem>
                    <SelectItem value="CONTINUE">Continue selling when out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {variantForm.fulfillmentType === "PRE_ORDER" || variantForm.fulfillmentType === "MADE_TO_ORDER" ? (
              <div className="space-y-1.5">
                <Label>Lead time (days)</Label>
                <Input
                  type="number" min={0}
                  value={variantForm.leadTimeDays ?? 0}
                  onChange={(e) => setVariantForm((f) => ({ ...f, leadTimeDays: Number(e.target.value) }))}
                />
              </div>
            ) : null}
            {options.length > 0 && (
              <div className="space-y-1.5">
                <Label>Option values</Label>
                {editingVariant ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(editingVariant.optionValues ?? []).length > 0 ? (
                      (editingVariant.optionValues ?? []).map((ov) => (
                        <span
                          key={ov.optionName}
                          className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs"
                        >
                          <span className="text-muted-foreground">{ov.optionName}:</span>
                          <span className="font-medium">{ov.valueLabel}</span>
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No option values assigned.</p>
                    )}
                    <p className="w-full text-xs text-muted-foreground mt-1">
                      Option values cannot be changed after creation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <div key={opt.id} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{opt.name}</p>
                        <Select
                          onValueChange={(valId) => {
                            const current = (variantForm.optionValueIds ?? []) as string[]
                            const optValIds = (opt.values ?? []).map((v) => v.id!)
                            const filtered = current.filter((vid) => !optValIds.includes(vid))
                            setVariantForm((f) => ({ ...f, optionValueIds: [...filtered, valId] }))
                          }}
                          value={
                            (variantForm.optionValueIds ?? []).find((vid) =>
                              (opt.values ?? []).some((v) => v.id === vid)
                            ) ?? ""
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${opt.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {(opt.values ?? []).map((val) => (
                              <SelectItem key={val.id} value={val.id!}>{val.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantOpen(false)}>Cancel</Button>
            <Button
              onClick={handleVariantSave}
              disabled={createVariantMutation.isPending || updateVariantMutation.isPending}
            >
              {editingVariant ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete variant confirm */}
      <AlertDialog open={!!deleteVariant} onOpenChange={(o) => !o && setDeleteVariant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the variant
              {deleteVariant?.sku ? ` (SKU: ${deleteVariant.sku})` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVariant?.id && deleteVariantMutation.mutate(deleteVariant.id)}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
