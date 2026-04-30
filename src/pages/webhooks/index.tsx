import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { webhookApi, type WebhookEndpoint, type WebhookDelivery, type CreateWebhookEndpointRequest, type UpdateWebhookEndpointRequest } from "@/lib/webhook-api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, History } from "lucide-react"
import { toast } from "sonner"

const DELIVERY_PAGE_SIZE = 20

function statusVariant(status: WebhookDelivery["status"]) {
  switch (status) {
    case "SUCCESS": return "default"
    case "FAILED": return "destructive"
    case "RETRYING": return "secondary"
    default: return "outline"
  }
}

function DeliveryDrawer({
  endpoint,
  open,
  onClose,
}: {
  endpoint: WebhookEndpoint | null
  open: boolean
  onClose: () => void
}) {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "webhooks", endpoint?.id, "deliveries", page],
    queryFn: () => webhookApi.listDeliveries(endpoint!.id, page, DELIVERY_PAGE_SIZE),
    enabled: !!endpoint,
  })

  const deliveries: WebhookDelivery[] = data?.content ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / DELIVERY_PAGE_SIZE) || 1

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Delivery history</SheetTitle>
          {endpoint && (
            <p className="text-sm text-muted-foreground truncate">{endpoint.url}</p>
          )}
        </SheetHeader>

        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Last attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && deliveries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No deliveries yet.
                  </TableCell>
                </TableRow>
              )}
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.eventType}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.httpStatus ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{d.attemptCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.lastAttemptedAt
                      ? new Date(d.lastAttemptedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span>
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

type FormState = Partial<CreateWebhookEndpointRequest>

function EndpointDialog({
  open,
  onClose,
  existing,
  eventTypes,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  existing?: WebhookEndpoint | null
  eventTypes: string[]
  onSave: (form: FormState) => void
  isPending: boolean
}) {
  const [form, setForm] = useState<FormState>(
    existing
      ? { url: existing.url, description: existing.description ?? "", events: existing.events, secret: "" }
      : { events: [] }
  )

  function toggleEvent(event: string) {
    setForm((f) => {
      const current = f.events ?? []
      return {
        ...f,
        events: current.includes(event)
          ? current.filter((e) => e !== event)
          : [...current, event],
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit webhook" : "Create webhook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              type="url"
              placeholder="https://example.com/webhook"
              value={form.url ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Secret{existing && <span className="text-muted-foreground"> (leave blank to keep current)</span>}</Label>
            <Input
              type="password"
              placeholder={existing ? "••••••••" : "signing secret"}
              value={form.secret ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Optional description"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
              {eventTypes.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={(form.events ?? []).includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <span className="font-mono text-xs">{event}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={isPending}>
            {existing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WebhooksPage() {
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editEndpoint, setEditEndpoint] = useState<WebhookEndpoint | null>(null)
  const [deliveryEndpoint, setDeliveryEndpoint] = useState<WebhookEndpoint | null>(null)
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ["admin", "webhooks"],
    queryFn: () => webhookApi.list(),
  })

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["admin", "webhooks", "events"],
    queryFn: () => webhookApi.listEventTypes(),
  })

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "webhooks"] })
  }

  const createMutation = useMutation({
    mutationFn: (form: FormState) =>
      webhookApi.create(form as CreateWebhookEndpointRequest),
    onSuccess: () => {
      toast.success("Webhook created")
      invalidate()
      setCreateOpen(false)
    },
    onError: () => toast.error("Failed to create webhook"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateWebhookEndpointRequest }) =>
      webhookApi.update(id, body),
    onSuccess: () => {
      toast.success("Webhook updated")
      invalidate()
      setEditEndpoint(null)
    },
    onError: () => toast.error("Failed to update webhook"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookApi.delete(id),
    onSuccess: () => {
      toast.success("Webhook deleted")
      invalidate()
    },
    onError: () => toast.error("Failed to delete webhook"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      webhookApi.update(id, { active }),
    onSuccess: () => {
      toast.success("Webhook updated")
      invalidate()
    },
    onError: () => toast.error("Failed to update webhook"),
  })

  function handleCreate(form: FormState) {
    if (!form.url || !form.secret || !form.events?.length) {
      toast.error("URL, secret and at least one event are required")
      return
    }
    createMutation.mutate(form)
  }

  function handleEdit(form: FormState) {
    if (!editEndpoint) return
    const body: UpdateWebhookEndpointRequest = {
      url: form.url,
      description: form.description,
      events: form.events,
    }
    if (form.secret) body.secret = form.secret
    updateMutation.mutate({ id: editEndpoint.id, body })
  }

  function openDeliveries(endpoint: WebhookEndpoint) {
    setDeliveryEndpoint(endpoint)
    setDeliveryOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add endpoint
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && endpoints.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No webhook endpoints configured.
                </TableCell>
              </TableRow>
            )}
            {endpoints.map((ep) => (
              <TableRow key={ep.id}>
                <TableCell className="font-mono text-sm max-w-xs truncate">{ep.url}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ep.description ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {ep.events.slice(0, 3).map((e) => (
                      <Badge key={e} variant="outline" className="font-mono text-xs">
                        {e}
                      </Badge>
                    ))}
                    {ep.events.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{ep.events.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={ep.active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: ep.id, active: checked })
                    }
                  />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(ep.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openDeliveries(ep)}
                    >
                      <History className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setEditEndpoint(ep)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => deleteMutation.mutate(ep.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EndpointDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        eventTypes={eventTypes}
        onSave={handleCreate}
        isPending={createMutation.isPending}
      />

      <EndpointDialog
        open={!!editEndpoint}
        onClose={() => setEditEndpoint(null)}
        existing={editEndpoint}
        eventTypes={eventTypes}
        onSave={handleEdit}
        isPending={updateMutation.isPending}
      />

      <DeliveryDrawer
        endpoint={deliveryEndpoint}
        open={deliveryOpen}
        onClose={() => { setDeliveryOpen(false); setDeliveryEndpoint(null) }}
      />
    </div>
  )
}
