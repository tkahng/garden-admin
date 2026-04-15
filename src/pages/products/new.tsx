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
import { ArrowLeft, X } from "lucide-react"
import { toast } from "sonner"

type CreateProduct = components["schemas"]["CreateProductRequest"]

export function NewProductPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateProduct>({ title: "" })
  const [tagInput, setTagInput] = useState("")

  const createMutation = useMutation({
    mutationFn: async (body: CreateProduct) => {
      const { data, error } = await apiClient.POST("/api/v1/admin/products", { body })
      if (error) throw error
      return data?.data
    },
    onSuccess: (product) => {
      toast.success("Product created")
      if (product?.id) {
        void navigate({ to: "/products/$productId", params: { productId: product.id } })
      } else {
        void navigate({ to: "/products" })
      }
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/products"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Add product</h1>
        </div>
        <Button onClick={() => createMutation.mutate(form)} disabled={!canSave}>
          Save product
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                  placeholder="Describe the product..."
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || undefined }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vendor</Label>
                  <Input
                    placeholder="e.g. Garden Co."
                    value={form.vendor ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value || undefined }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Product type</Label>
                  <Input
                    placeholder="e.g. Plant, Tool"
                    value={form.productType ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value || undefined }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>URL handle</Label>
                <Input
                  placeholder="auto-generated from title"
                  value={form.handle ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value || undefined }))}
                />
                <p className="text-xs text-muted-foreground">Leave blank to auto-generate from title.</p>
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
                    placeholder="Add a tag..."
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
                <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Next steps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>After saving you can:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Add options (Color, Size…)</li>
                <li>Create variants</li>
                <li>Upload images</li>
                <li>Set status to Active</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/products">Cancel</Link>
            </Button>
            <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={!canSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
