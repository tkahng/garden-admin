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
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ChevronDown, ChevronUp, ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Collection = components["schemas"]["AdminCollectionResponse"]
type CollectionRule = components["schemas"]["CollectionRuleResponse"]
type CollectionProduct = components["schemas"]["CollectionProductResponse"]
type UpdateCollection = components["schemas"]["UpdateCollectionRequest"]
type CreateRule = components["schemas"]["CreateCollectionRuleRequest"]

const RULE_FIELDS = ["TAG"] as const
const RULE_OPERATORS = ["EQUALS", "NOT_EQUALS", "CONTAINS"] as const

function operatorLabel(op: string) {
  switch (op) {
    case "EQUALS": return "is equal to"
    case "NOT_EQUALS": return "is not equal to"
    case "CONTAINS": return "contains"
    default: return op
  }
}

function statusVariant(status: string | undefined) {
  return status === "ACTIVE" ? "default" : "secondary"
}

export function CollectionDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "collections", id] })

  // Edit info
  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState<UpdateCollection>({})

  // Delete collection
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Rule state
  const [addRuleOpen, setAddRuleOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState<CreateRule>({
    field: "TAG",
    operator: "EQUALS",
    value: "",
  })
  const [deleteRule, setDeleteRule] = useState<CollectionRule | null>(null)

  // Product picker
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [pickerSelectedIds, setPickerSelectedIds] = useState<Set<string>>(new Set())
  const [removeProduct, setRemoveProduct] = useState<CollectionProduct | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────────

  const { data: collection, isLoading } = useQuery({
    queryKey: ["admin", "collections", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/collections/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
      return data?.data
    },
    enabled: !!id,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin", "collections", id, "products"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/collections/{id}/products", {
        params: { path: { id }, query: { size: 100 } },
      })
      if (error) throw error
      return data?.data?.content ?? []
    },
    enabled: !!id,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async (body: UpdateCollection) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/collections/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Collection updated"); invalidate(); setEditInfo(false) },
    onError: () => toast.error("Failed to update"),
  })

  const statusMutation = useMutation({
    mutationFn: async (status: "DRAFT" | "ACTIVE") => {
      const { error } = await apiClient.PATCH("/api/v1/admin/collections/{id}/status", {
        params: { path: { id } },
        body: { status },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Status updated"); invalidate() },
    onError: () => toast.error("Failed to update status"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.DELETE("/api/v1/admin/collections/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Collection deleted")
      window.history.back()
    },
    onError: () => toast.error("Failed to delete collection"),
  })

  // Rule mutations
  const addRuleMutation = useMutation({
    mutationFn: async (body: CreateRule) => {
      const { error } = await apiClient.POST("/api/v1/admin/collections/{id}/rules", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Rule added"); invalidate()
      setAddRuleOpen(false)
      setRuleForm({ field: "TAG", operator: "EQUALS", value: "" })
    },
    onError: () => toast.error("Failed to add rule"),
  })

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/collections/{id}/rules/{ruleId}", {
        params: { path: { id, ruleId } },
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Rule deleted"); invalidate(); setDeleteRule(null) },
    onError: () => toast.error("Failed to delete rule"),
  })

  // Product mutations
  const addProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      for (const productId of productIds) {
        const { error } = await apiClient.POST("/api/v1/admin/collections/{id}/products", {
          params: { path: { id } },
          body: { productId },
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success("Products added")
      void qc.invalidateQueries({ queryKey: ["admin", "collections", id, "products"] })
      invalidate()
      setProductPickerOpen(false)
      setPickerSelectedIds(new Set())
    },
    onError: () => toast.error("Failed to add products"),
  })

  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/collections/{id}/products/{productId}", {
        params: { path: { id, productId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Product removed")
      void qc.invalidateQueries({ queryKey: ["admin", "collections", id, "products"] })
      invalidate()
      setRemoveProduct(null)
    },
    onError: () => toast.error("Failed to remove product"),
  })

  const moveProductMutation = useMutation({
    mutationFn: async ({ productId, position }: { productId: string; position: number }) => {
      const { error } = await apiClient.PATCH(
        "/api/v1/admin/collections/{id}/products/{productId}/position",
        {
          params: { path: { id, productId } },
          body: { position },
        }
      )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "collections", id, "products"] })
    },
    onError: () => toast.error("Failed to reorder"),
  })

  function moveProduct(colProduct: CollectionProduct, dir: "up" | "down") {
    const products = [...(productsData ?? [])]
    const idx = products.findIndex((p) => p.id === colProduct.id)
    if (idx === -1) return
    const swap = dir === "up" ? idx - 1 : idx + 1
    if (swap < 0 || swap >= products.length) return
    moveProductMutation.mutate({ productId: colProduct.productId!, position: swap + 1 })
  }

  function openEditInfo() {
    setInfoForm({
      title: collection?.title,
      description: collection?.description,
      handle: collection?.handle,
      disjunctive: collection?.disjunctive,
    })
    setEditInfo(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <div className="text-muted-foreground p-4">Loading...</div>
  if (!collection) return <div className="text-muted-foreground p-4">Collection not found</div>

  const c = collection as Collection
  const isManual = c.collectionType === "MANUAL"
  const products = productsData ?? []
  const rules = c.rules ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/collections"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{c.title ?? "Untitled"}</h1>
          <p className="text-sm text-muted-foreground">{c.handle ?? ""}</p>
        </div>
        <Badge variant={statusVariant(c.status)}>{c.status ?? "DRAFT"}</Badge>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Info card */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={openEditInfo}>
                <Pencil className="size-3.5 mr-1.5" />Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-y-2">
                <span className="text-muted-foreground">Title</span>
                <span>{c.title ?? "—"}</span>
                <span className="text-muted-foreground">Handle</span>
                <span className="font-mono text-xs">{c.handle ?? "—"}</span>
                <span className="text-muted-foreground">Type</span>
                <span>
                  <Badge variant="outline" className="text-xs">
                    {c.collectionType === "MANUAL" ? "Manual" : "Automated"}
                  </Badge>
                </span>
                {!isManual && (
                  <>
                    <span className="text-muted-foreground">Conditions</span>
                    <span>{c.disjunctive ? "Match any condition" : "Match all conditions"}</span>
                  </>
                )}
              </div>
              {c.description && (
                <p className="text-muted-foreground leading-relaxed">{c.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Manual: products */}
          {isManual && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Products ({c.productCount ?? 0})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setProductPickerOpen(true)}>
                  <Plus className="size-3.5 mr-1.5" />Add products
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {productsLoading ? (
                  <p className="text-sm text-muted-foreground px-6 py-4">Loading...</p>
                ) : products.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No products yet.</p>
                    <Button variant="link" size="sm" onClick={() => setProductPickerOpen(true)}>
                      Add your first product
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-20">Position</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((cp, idx) => (
                        <TableRow key={cp.id}>
                          <TableCell>
                            <div className="size-8 rounded border bg-muted overflow-hidden flex items-center justify-center">
                              {cp.featuredImageUrl ? (
                                <img
                                  src={cp.featuredImageUrl}
                                  alt={cp.title ?? ""}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="size-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/products/$productId"
                              params={{ productId: cp.productId! }}
                              className="font-medium hover:underline text-sm"
                            >
                              {cp.title ?? "Untitled"}
                            </Link>
                            {cp.handle && (
                              <p className="text-xs text-muted-foreground font-mono">{cp.handle}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {cp.position ?? idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="size-6"
                                disabled={idx === 0}
                                onClick={() => moveProduct(cp, "up")}
                              >
                                <ChevronUp className="size-3" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="size-6"
                                disabled={idx === products.length - 1}
                                onClick={() => moveProduct(cp, "down")}
                              >
                                <ChevronDown className="size-3" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="size-6 text-destructive"
                                onClick={() => setRemoveProduct(cp)}
                              >
                                <Trash2 className="size-3" />
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
          )}

          {/* Automated: rules */}
          {!isManual && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">Conditions</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Products must match</span>
                    <Select
                      value={c.disjunctive ? "any" : "all"}
                      onValueChange={(v) =>
                        updateMutation.mutate({ disjunctive: v === "any" })
                      }
                    >
                      <SelectTrigger className="h-6 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">all</SelectItem>
                        <SelectItem value="any">any</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">conditions</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddRuleOpen(true)}>
                  <Plus className="size-3.5 mr-1.5" />Add condition
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No conditions yet. Products matching conditions are added automatically.
                  </p>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm group"
                    >
                      <Badge variant="outline" className="text-xs shrink-0">{rule.field}</Badge>
                      <span className="text-muted-foreground shrink-0">{operatorLabel(rule.operator ?? "")}</span>
                      <span className="font-medium flex-1 truncate">{rule.value}</span>
                      <Button
                        variant="ghost" size="icon" className="size-6 text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() => setDeleteRule(rule)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  {c.productCount ?? 0} product{c.productCount !== 1 ? "s" : ""} match{c.productCount === 1 ? "es" : ""} these conditions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">

          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={c.status ?? "DRAFT"}
                onValueChange={(v) => statusMutation.mutate(v as "DRAFT" | "ACTIVE")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {c.status === "ACTIVE" ? "Visible in storefront" : "Not published yet"}
              </p>
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{c.collectionType === "MANUAL" ? "Manual" : "Automated"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Products</span>
                <span>{c.productCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{String(c.id ?? "").slice(0, 8)}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Edit info */}
      <Dialog open={editInfo} onOpenChange={setEditInfo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit collection details</DialogTitle></DialogHeader>
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
            <div className="space-y-1.5">
              <Label>URL handle</Label>
              <Input
                value={infoForm.handle ?? ""}
                onChange={(e) => setInfoForm((f) => ({ ...f, handle: e.target.value }))}
              />
            </div>
            {!isManual && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Match any condition</Label>
                  <p className="text-xs text-muted-foreground">
                    Products matching any (vs all) conditions are included.
                  </p>
                </div>
                <Switch
                  checked={infoForm.disjunctive ?? false}
                  onCheckedChange={(v) => setInfoForm((f) => ({ ...f, disjunctive: v }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInfo(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate(infoForm)} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add rule */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add condition</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Select
                value={ruleForm.field}
                onValueChange={(v) => setRuleForm((f) => ({ ...f, field: v as "TAG" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULE_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>{f.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Operator</Label>
              <Select
                value={ruleForm.operator}
                onValueChange={(v) => setRuleForm((f) => ({ ...f, operator: v as typeof RULE_OPERATORS[number] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULE_OPERATORS.map((op) => (
                    <SelectItem key={op} value={op}>{operatorLabel(op)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                placeholder="e.g. sale, new-arrival"
                value={ruleForm.value}
                onChange={(e) => setRuleForm((f) => ({ ...f, value: e.target.value }))}
                onKeyDown={(e) =>
                  e.key === "Enter" && ruleForm.value.trim() &&
                  addRuleMutation.mutate(ruleForm)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRuleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addRuleMutation.mutate(ruleForm)}
              disabled={addRuleMutation.isPending || !ruleForm.value.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete rule */}
      <AlertDialog open={!!deleteRule} onOpenChange={(o) => !o && setDeleteRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete condition?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove condition: {deleteRule?.field} {operatorLabel(deleteRule?.operator ?? "")} "{deleteRule?.value}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRule?.id && deleteRuleMutation.mutate(deleteRule.id)}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product picker */}
      <Dialog
        open={productPickerOpen}
        onOpenChange={(o) => {
          setProductPickerOpen(o)
          if (!o) { setPickerSelectedIds(new Set()); setProductSearch("") }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Add products</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            <ProductPickerList
              search={productSearch}
              selectedIds={pickerSelectedIds}
              existingProductIds={new Set(products.map((p) => p.productId!).filter(Boolean))}
              onToggle={(productId) => {
                setPickerSelectedIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(productId)) next.delete(productId)
                  else next.add(productId)
                  return next
                })
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addProductsMutation.mutate(Array.from(pickerSelectedIds))}
              disabled={pickerSelectedIds.size === 0 || addProductsMutation.isPending}
            >
              Add {pickerSelectedIds.size > 0 ? pickerSelectedIds.size : ""} product{pickerSelectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove product confirm */}
      <AlertDialog open={!!removeProduct} onOpenChange={(o) => !o && setRemoveProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove product?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{removeProduct?.title}" from this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeProduct?.productId && removeProductMutation.mutate(removeProduct.productId)}
            >Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete collection */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{c.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Product picker list ───────────────────────────────────────────────────────

function ProductPickerList({
  search,
  selectedIds,
  existingProductIds,
  onToggle,
}: {
  search: string
  selectedIds: Set<string>
  existingProductIds: Set<string>
  onToggle: (id: string) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", "picker", search],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/products", {
        params: { query: { page: 0, size: 30, titleContains: search || undefined, status: "ACTIVE" } },
      })
      if (error) throw error
      return data?.data?.content ?? []
    },
  })

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (!data?.length) {
    return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No products found.</div>
  }

  return (
    <div className="max-h-72 overflow-y-auto space-y-1">
      {data.map((p) => {
        const productId = p.id!
        const alreadyAdded = existingProductIds.has(productId)
        const selected = selectedIds.has(productId)
        const thumb = (p.images as { url?: string; altText?: string }[] | undefined)?.[0]
        return (
          <button
            key={productId}
            disabled={alreadyAdded}
            onClick={() => !alreadyAdded && onToggle(productId)}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
              alreadyAdded ? "opacity-40 cursor-not-allowed" :
              selected ? "bg-primary/10 border border-primary/30" :
              "hover:bg-muted"
            )}
          >
            <div className="size-8 rounded border bg-muted shrink-0 overflow-hidden flex items-center justify-center">
              {thumb?.url ? (
                <img src={thumb.url} alt={thumb.altText ?? ""} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="size-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.title ?? "Untitled"}</p>
              {p.handle && <p className="text-xs text-muted-foreground font-mono truncate">{p.handle}</p>}
            </div>
            {alreadyAdded && <span className="text-xs text-muted-foreground shrink-0">Added</span>}
            {selected && !alreadyAdded && (
              <div className="size-4 rounded-full bg-primary shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
