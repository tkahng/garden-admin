import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, X } from "lucide-react"
import { toast } from "sonner"

type CreateProduct = components["schemas"]["CreateProductRequest"]
type CreateVariant = components["schemas"]["CreateVariantRequest"]
type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

const WEIGHT_UNITS = ["kg", "g", "lb", "oz"]

export function NewProductPage() {
  const navigate = useNavigate()

  // Product fields
  const [form, setForm] = useState<CreateProduct>({ title: "" })
  const [tagInput, setTagInput] = useState("")
  const [status, setStatus] = useState<ProductStatus>("DRAFT")

  // Default variant fields
  const [price, setPrice] = useState("")
  const [compareAtPrice, setCompareAtPrice] = useState("")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [weight, setWeight] = useState("")
  const [weightUnit, setWeightUnit] = useState("kg")

  const createMutation = useMutation({
    mutationFn: async () => {
      // Step 1: create product
      const { data: productData, error: productError } = await apiClient.POST(
        "/api/v1/admin/products",
        { body: form }
      )
      if (productError) throw productError
      const productId = productData?.data?.id
      if (!productId) throw new Error("No product id returned")

      // Step 2: create default variant if any variant field is filled
      const hasVariantData =
        price || compareAtPrice || sku || barcode || weight
      if (hasVariantData) {
        const variantBody: CreateVariant = {}
        if (price) variantBody.price = parseFloat(price)
        if (compareAtPrice) variantBody.compareAtPrice = parseFloat(compareAtPrice)
        if (sku) variantBody.sku = sku
        if (barcode) variantBody.barcode = barcode
        if (weight) {
          variantBody.weight = parseFloat(weight)
          variantBody.weightUnit = weightUnit
        }
        const { error: variantError } = await apiClient.POST(
          "/api/v1/admin/products/{id}/variants",
          { params: { path: { id: productId } }, body: variantBody }
        )
        if (variantError) throw variantError
      }

      // Step 3: set status if not DRAFT
      if (status !== "DRAFT") {
        const { error: statusError } = await apiClient.PATCH(
          "/api/v1/admin/products/{id}/status",
          { params: { path: { id: productId } }, body: { status } }
        )
        if (statusError) throw statusError
      }

      return productId
    },
    onSuccess: (productId) => {
      toast.success("Product created")
      void navigate({ to: "/products/$productId", params: { productId } })
    },
    onError: () => toast.error("Failed to create product"),
  })

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    const existing = form.tags ?? []
    if (!existing.includes(trimmed)) {
      setForm((f) => ({ ...f, tags: [...existing, trimmed] }))
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: (f.tags ?? []).filter((t) => t !== tag) }))
  }

  const canSave = form.title.trim().length > 0 && !createMutation.isPending

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Add product</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/products">Discard</Link>
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={!canSave}>
            {createMutation.isPending ? "Saving…" : "Save product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Product details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Rose Bush Red"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  placeholder="Describe the product…"
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value || undefined }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      className="pl-7"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Compare-at price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      className="pl-7"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Original price to show as struck-through.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>SKU (Stock Keeping Unit)</Label>
                  <Input
                    placeholder="e.g. ROSE-RED-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Barcode (ISBN, UPC, GTIN, etc.)</Label>
                  <Input
                    placeholder="e.g. 012345678901"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label>Weight</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="0.0"
                    type="number"
                    min="0"
                    step="0.001"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                  <Select value={weightUnit} onValueChange={setWeightUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to calculate shipping rates at checkout.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProductStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {status === "ACTIVE"
                  ? "Visible to customers."
                  : status === "DRAFT"
                    ? "Not visible to customers."
                    : "Hidden and removed from channels."}
              </p>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input
                  placeholder="e.g. Garden Co."
                  value={form.vendor ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Product type</Label>
                <Input
                  placeholder="e.g. Plant, Tool"
                  value={form.productType ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productType: e.target.value || undefined }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(form.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        className="opacity-60 hover:opacity-100"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        addTag(tagInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Enter or comma to add.</p>
              </div>
              <div className="space-y-1.5">
                <Label>URL handle</Label>
                <Input
                  placeholder="auto-generated from title"
                  value={form.handle ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, handle: e.target.value || undefined }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-generate.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!canSave}
          >
            {createMutation.isPending ? "Saving…" : "Save product"}
          </Button>
        </div>
      </div>
    </div>
  )
}
