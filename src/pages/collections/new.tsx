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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

type CreateCollection = components["schemas"]["CreateCollectionRequest"]

export function NewCollectionPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateCollection>({
    title: "",
    collectionType: "MANUAL",
  })

  const createMutation = useMutation({
    mutationFn: async (body: CreateCollection) => {
      const { data, error } = await apiClient.POST("/api/v1/admin/collections", { body })
      if (error) throw error
      return data?.data
    },
    onSuccess: (c) => {
      toast.success("Collection created")
      if (c?.id) {
        void navigate({ to: "/collections/$collectionId", params: { collectionId: c.id } })
      } else {
        void navigate({ to: "/collections" })
      }
    },
    onError: () => toast.error("Failed to create collection"),
  })

  const canSave = form.title.trim().length > 0 && !createMutation.isPending

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/collections"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Create collection</h1>
        </div>
        <Button onClick={() => createMutation.mutate(form)} disabled={!canSave}>
          Save collection
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Summer Plants"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  placeholder="Describe the collection..."
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || undefined }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL handle</Label>
                <Input
                  placeholder="auto-generated from title"
                  value={form.handle ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value || undefined }))}
                />
                <p className="text-xs text-muted-foreground">Leave blank to auto-generate.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Collection type</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={form.collectionType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, collectionType: v as "MANUAL" | "AUTOMATED" }))
                }
                className="space-y-3"
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="MANUAL" id="manual" className="mt-0.5" />
                  <div>
                    <Label htmlFor="manual" className="font-medium cursor-pointer">Manual</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add products one by one.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="AUTOMATED" id="automated" className="mt-0.5" />
                  <div>
                    <Label htmlFor="automated" className="font-medium cursor-pointer">Automated</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Products added automatically based on rules.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/collections">Cancel</Link>
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
