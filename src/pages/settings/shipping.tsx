import { useState } from "react"
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Plus, ChevronDown, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Zone = components["schemas"]["ShippingZoneResponse"]
type Rate = components["schemas"]["ShippingRateResponse"]
type CreateZone = components["schemas"]["CreateShippingZoneRequest"]
type CreateRate = components["schemas"]["CreateShippingRateRequest"]

function ZoneCard({ zone }: { zone: Zone }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateRate>>({})

  const { data: ratesData } = useQuery({
    queryKey: ["admin", "shipping", "zones", zone.id, "rates"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/admin/shipping/zones/{zoneId}/rates",
        { params: { path: { zoneId: zone.id! } } }
      )
      if (error) throw error
      return data
    },
    enabled: open,
  })

  const rates: Rate[] =
    (ratesData as { data?: { content?: Rate[] } } | undefined)?.data?.content ?? []

  const createRateMutation = useMutation({
    mutationFn: async (body: CreateRate) => {
      const { error } = await apiClient.POST("/api/v1/admin/shipping/zones/{zoneId}/rates", {
        params: { path: { zoneId: zone.id! } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Rate added")
      qc.invalidateQueries({ queryKey: ["admin", "shipping", "zones", zone.id, "rates"] })
      setRateOpen(false)
      setForm({})
    },
    onError: () => toast.error("Failed to add rate"),
  })

  const deleteRateMutation = useMutation({
    mutationFn: async (rateId: string) => {
      const { error } = await apiClient.DELETE(
        "/api/v1/admin/shipping/zones/{zoneId}/rates/{rateId}",
        { params: { path: { zoneId: zone.id!, rateId } } }
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Rate deleted")
      qc.invalidateQueries({ queryKey: ["admin", "shipping", "zones", zone.id, "rates"] })
    },
    onError: () => toast.error("Failed to delete rate"),
  })

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-muted/30 rounded-t-lg flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{zone.name}</CardTitle>
              {zone.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{zone.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {zone.countryCodes?.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
              <Badge variant={zone.isActive ? "default" : "secondary"}>
                {zone.isActive ? "Active" : "Inactive"}
              </Badge>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Rates</p>
              <Button size="sm" variant="outline" onClick={() => setRateOpen(true)}>
                <Plus className="size-3.5 mr-1.5" />
                Add rate
              </Button>
            </div>

            {rates.length === 0 && (
              <p className="text-sm text-muted-foreground">No rates configured.</p>
            )}

            <div className="space-y-2">
              {rates.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{r.name}</span>
                    {r.carrier && (
                      <span className="ml-2 text-muted-foreground text-xs">{r.carrier}</span>
                    )}
                    {(r.estimatedDaysMin != null || r.estimatedDaysMax != null) && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        {r.estimatedDaysMin}–{r.estimatedDaysMax} days
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${(r.price ?? 0).toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => deleteRateMutation.mutate(r.id!)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add rate to {zone.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Rate name</Label>
              <Input
                placeholder="Standard shipping"
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Carrier</Label>
                <Input
                  placeholder="UPS"
                  value={form.carrier ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min days</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.estimatedDaysMin ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimatedDaysMin: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max days</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.estimatedDaysMax ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimatedDaysMax: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Min order amount ($)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={form.minOrderAmount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name || form.price == null) {
                  toast.error("Name and price are required")
                  return
                }
                createRateMutation.mutate({ name: form.name, price: form.price, ...form } as CreateRate)
              }}
              disabled={createRateMutation.isPending}
            >
              Add rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function ShippingPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateZone>>({})

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shipping", "zones"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/shipping/zones", {})
      if (error) throw error
      return data
    },
  })

  const zones: Zone[] =
    (data as { data?: { content?: Zone[] } } | undefined)?.data?.content ?? []

  const createMutation = useMutation({
    mutationFn: async (body: CreateZone) => {
      const { error } = await apiClient.POST("/api/v1/admin/shipping/zones", { body })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Shipping zone created")
      qc.invalidateQueries({ queryKey: ["admin", "shipping", "zones"] })
      setOpen(false)
      setForm({})
    },
    onError: () => toast.error("Failed to create zone"),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shipping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define zones and rates for shipping.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add zone
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

      <div className="space-y-3">
        {zones.map((z) => (
          <ZoneCard key={z.id} zone={z} />
        ))}
        {!isLoading && zones.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
            No shipping zones configured.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create shipping zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Zone name</Label>
              <Input
                placeholder="Domestic"
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Optional"
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country codes (comma-separated)</Label>
              <Input
                placeholder="US, CA, MX"
                value={form.countryCodes?.join(", ") ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    countryCodes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name) { toast.error("Name is required"); return }
                createMutation.mutate({ name: form.name, ...form } as CreateZone)
              }}
              disabled={createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
