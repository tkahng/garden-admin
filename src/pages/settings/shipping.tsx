import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CountrySelect } from "@/components/CountrySelect"
import { countryLabel } from "@/lib/countries"
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
import { Plus, ChevronDown, Trash2, Pencil, X } from "lucide-react"
import { toast } from "sonner"

type Zone = components["schemas"]["ShippingZoneResponse"]
type Rate = components["schemas"]["ShippingRateResponse"]
type CreateZone = components["schemas"]["CreateShippingZoneRequest"]
type CreateRate = components["schemas"]["CreateShippingRateRequest"]
type UpdateZone = components["schemas"]["UpdateShippingZoneRequest"]
type UpdateRate = components["schemas"]["UpdateShippingRateRequest"]

// ── Rate dialog ───────────────────────────────────────────────────────────────

function RateDialog({
  open,
  onClose,
  zoneName,
  existing,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  zoneName: string
  existing?: Rate | null
  onSave: (form: Partial<CreateRate>) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<Partial<CreateRate>>(
    existing
      ? {
          name: existing.name ?? "",
          price: existing.price ?? 0,
          carrier: existing.carrier ?? "",
          estimatedDaysMin: existing.estimatedDaysMin ?? undefined,
          estimatedDaysMax: existing.estimatedDaysMax ?? undefined,
          minOrderAmount: existing.minOrderAmount ?? undefined,
        }
      : {}
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit rate" : `Add rate to ${zoneName}`}</DialogTitle>
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
                onChange={(e) => setForm((f) => ({ ...f, estimatedDaysMin: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max days</Label>
              <Input
                type="number"
                min={0}
                value={form.estimatedDaysMax ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, estimatedDaysMax: Number(e.target.value) }))}
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
              onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.name || form.price == null) {
                toast.error("Name and price are required")
                return
              }
              onSave(form)
            }}
            disabled={isPending}
          >
            {existing ? "Save" : "Add rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Zone card ─────────────────────────────────────────────────────────────────

function ZoneCard({ zone, onEdit, onDelete }: {
  zone: Zone
  onEdit: (zone: Zone) => void
  onDelete: (id: string) => void
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [editRate, setEditRate] = useState<Rate | null>(null)

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

  const rates: Rate[] = (ratesData as { data?: Rate[] } | undefined)?.data ?? []

  function invalidateRates() {
    qc.invalidateQueries({ queryKey: ["admin", "shipping", "zones", zone.id, "rates"] })
  }

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
      invalidateRates()
      setRateDialogOpen(false)
    },
    onError: () => toast.error("Failed to add rate"),
  })

  const updateRateMutation = useMutation({
    mutationFn: async ({ rateId, body }: { rateId: string; body: UpdateRate }) => {
      const { error } = await apiClient.PUT(
        "/api/v1/admin/shipping/zones/{zoneId}/rates/{rateId}",
        { params: { path: { zoneId: zone.id!, rateId } }, body }
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Rate updated")
      invalidateRates()
      setEditRate(null)
    },
    onError: () => toast.error("Failed to update rate"),
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
      invalidateRates()
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
                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
              ))}
              <Badge variant={zone.isActive ? "default" : "secondary"}>
                {zone.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => { e.stopPropagation(); onEdit(zone) }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(zone.id!) }}
              >
                <Trash2 className="size-3.5" />
              </Button>
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
              <Button size="sm" variant="outline" onClick={() => setRateDialogOpen(true)}>
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${(r.price ?? 0).toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setEditRate(r)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
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

      <RateDialog
        open={rateDialogOpen}
        onClose={() => setRateDialogOpen(false)}
        zoneName={zone.name ?? ""}
        onSave={(form) => createRateMutation.mutate(form as CreateRate)}
        isPending={createRateMutation.isPending}
      />

      <RateDialog
        open={!!editRate}
        onClose={() => setEditRate(null)}
        zoneName={zone.name ?? ""}
        existing={editRate}
        onSave={(form) =>
          updateRateMutation.mutate({ rateId: editRate!.id!, body: form as UpdateRate })
        }
        isPending={updateRateMutation.isPending}
      />
    </Card>
  )
}

// ── Zone dialog ───────────────────────────────────────────────────────────────

function ZoneDialog({
  open,
  onClose,
  existing,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  existing?: Zone | null
  onSave: (form: Partial<CreateZone & UpdateZone>) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<Partial<CreateZone & UpdateZone>>(
    existing
      ? {
          name: existing.name ?? "",
          description: existing.description ?? "",
          countryCodes: existing.countryCodes ?? [],
          isActive: existing.isActive ?? true,
        }
      : { isActive: true }
  )
  const [countryToAdd, setCountryToAdd] = useState("US")
  const countryCodes = form.countryCodes ?? []

  function addCountry() {
    setForm((f) => {
      const existingCodes = f.countryCodes ?? []
      if (existingCodes.includes(countryToAdd)) return f
      return { ...f, countryCodes: [...existingCodes, countryToAdd] }
    })
  }

  function removeCountry(code: string) {
    setForm((f) => ({
      ...f,
      countryCodes: (f.countryCodes ?? []).filter((country) => country !== code),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit zone" : "Create shipping zone"}</DialogTitle>
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
          <div className="space-y-2">
            <Label>Countries</Label>
            <div className="flex gap-2">
              <CountrySelect
                value={countryToAdd}
                onValueChange={setCountryToAdd}
                className="w-full"
              />
              <Button type="button" variant="outline" onClick={addCountry} aria-label="Add country">
                <Plus className="size-4" />
              </Button>
            </div>
            {countryCodes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {countryCodes.map((code) => (
                  <Badge key={code} variant="outline" className="gap-1 pr-1">
                    {countryLabel(code)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-4"
                      onClick={() => removeCountry(code)}
                      aria-label={`Remove ${countryLabel(code)}`}
                    >
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No countries selected.</p>
            )}
          </div>
          {existing && (
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.isActive ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.name) { toast.error("Name is required"); return }
              onSave(form)
            }}
            disabled={isPending}
          >
            {existing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ShippingPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editZone, setEditZone] = useState<Zone | null>(null)

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

  function invalidateZones() {
    qc.invalidateQueries({ queryKey: ["admin", "shipping", "zones"] })
  }

  const createMutation = useMutation({
    mutationFn: async (body: CreateZone) => {
      const { error } = await apiClient.POST("/api/v1/admin/shipping/zones", { body })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Shipping zone created")
      invalidateZones()
      setCreateOpen(false)
    },
    onError: () => toast.error("Failed to create zone"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateZone }) => {
      const { error } = await apiClient.PUT("/api/v1/admin/shipping/zones/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Zone updated")
      invalidateZones()
      setEditZone(null)
    },
    onError: () => toast.error("Failed to update zone"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/shipping/zones/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Zone deleted")
      invalidateZones()
    },
    onError: () => toast.error("Failed to delete zone"),
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
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add zone
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

      <div className="space-y-3">
        {zones.map((z) => (
          <ZoneCard
            key={z.id}
            zone={z}
            onEdit={setEditZone}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
        {!isLoading && zones.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
            No shipping zones configured.
          </div>
        )}
      </div>

      <ZoneDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(form) => createMutation.mutate(form as CreateZone)}
        isPending={createMutation.isPending}
      />

      <ZoneDialog
        open={!!editZone}
        onClose={() => setEditZone(null)}
        existing={editZone}
        onSave={(form) => updateMutation.mutate({ id: editZone!.id!, body: form as UpdateZone })}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
