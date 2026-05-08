import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Pencil } from "lucide-react"
import { toast } from "sonner"

type Location = components["schemas"]["LocationResponse"]
type CreateLocation = components["schemas"]["CreateLocationRequest"]

function LocationDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Location | null
  onSuccess: () => void
}) {
  const [name, setName] = useState(editing?.name ?? "")
  const [address, setAddress] = useState(editing?.address ?? "")

  useState(() => {
    if (open) { setName(editing?.name ?? ""); setAddress(editing?.address ?? "") }
  })

  const createMutation = useMutation({
    mutationFn: async (body: CreateLocation) => {
      const { error } = await apiClient.POST("/api/v1/admin/locations", { body })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Location created"); onSuccess() },
    onError: () => toast.error("Failed to create location"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: CreateLocation }) => {
      const { error } = await apiClient.PATCH("/api/v1/admin/locations/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success("Location updated"); onSuccess() },
    onError: () => toast.error("Failed to update location"),
  })

  function handleSubmit() {
    if (!name.trim()) { toast.error("Name is required"); return }
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, body: { name: name.trim(), address: address.trim() || undefined } })
    } else {
      createMutation.mutate({ name: name.trim(), address: address.trim() || undefined })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit location" : "Add location"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Warehouse A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address (optional)</Label>
            <Input
              placeholder="123 Main St, City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LocationsPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/locations", {})
      if (error) throw error
      return (data as { data?: Location[] } | undefined)?.data ?? []
    },
  })

  const locations = data ?? []

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/locations/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Location deactivated")
      void qc.invalidateQueries({ queryKey: ["admin", "locations"] })
    },
    onError: () => toast.error("Failed to deactivate"),
  })

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/locations/{id}/reactivate", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Location reactivated")
      void qc.invalidateQueries({ queryKey: ["admin", "locations"] })
    },
    onError: () => toast.error("Failed to reactivate"),
  })

  function onSuccess() {
    setDialogOpen(false)
    setEditing(null)
    void qc.invalidateQueries({ queryKey: ["admin", "locations"] })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="size-4 mr-2" />
          Add location
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">Loading…</TableCell>
              </TableRow>
            )}
            {!isLoading && locations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  No locations yet. Add one to start managing inventory.
                </TableCell>
              </TableRow>
            )}
            {locations.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{l.address ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={l.isActive ? "default" : "secondary"}>
                    {l.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => { setEditing(l); setDialogOpen(true) }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {l.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => l.id && deactivateMutation.mutate(l.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary"
                        onClick={() => l.id && reactivateMutation.mutate(l.id)}
                        disabled={reactivateMutation.isPending}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={onSuccess}
      />
    </div>
  )
}
