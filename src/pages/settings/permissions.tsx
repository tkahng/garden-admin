import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Plus, Pencil, Trash2, X, ShieldCheck, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"

type Role = components["schemas"]["RoleResponse"]
type Permission = components["schemas"]["PermissionResponse"]
type CreateRole = components["schemas"]["CreateRoleRequest"]
type UpdateRole = components["schemas"]["UpdateRoleRequest"]

// ─── Role form dialog ─────────────────────────────────────────────────────────

function RoleDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Role | null
  onSuccess: (role: Role) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "")
      setDescription(editing?.description ?? "")
    }
  }, [open, editing])

  const createMutation = useMutation({
    mutationFn: async (body: CreateRole) => {
      const { data, error } = await apiClient.POST("/api/v1/admin/iam/roles", { body })
      if (error) throw error
      return (data as { data?: Role } | undefined)?.data!
    },
    onSuccess: (role) => { toast.success("Role created"); onSuccess(role) },
    onError: () => toast.error("Failed to create role"),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateRole }) => {
      const { data, error } = await apiClient.PUT("/api/v1/admin/iam/roles/{id}", {
        params: { path: { id } },
        body,
      })
      if (error) throw error
      return (data as { data?: Role } | undefined)?.data!
    },
    onSuccess: (role) => { toast.success("Role updated"); onSuccess(role) },
    onError: () => toast.error("Failed to update role"),
  })

  function handleSubmit() {
    if (!name.trim()) { toast.error("Name is required"); return }
    if (editing) {
      updateMutation.mutate({ id: editing.id!, body: { name, description } })
    } else {
      createMutation.mutate({ name, description })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit role" : "Create role"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="e.g. catalog_manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="What this role can do…"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

// ─── Permission picker ────────────────────────────────────────────────────────

function PermissionPicker({
  allPermissions,
  assigned,
  onAssign,
  isPending,
}: {
  allPermissions: Permission[]
  assigned: Permission[]
  onAssign: (permissionId: string) => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const assignedIds = new Set(assigned.map((p) => p.id))
  const available = allPermissions.filter((p) => !assignedIds.has(p.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending || available.length === 0}>
          <Plus className="size-3.5 mr-1.5" />
          Add permission
          <ChevronsUpDown className="size-3.5 ml-1.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search permissions…" />
          <CommandList>
            <CommandEmpty>No permissions available.</CommandEmpty>
            <CommandGroup>
              {available.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name ?? ""}
                  onSelect={() => {
                    onAssign(p.id!)
                    setOpen(false)
                  }}
                >
                  <span className="font-mono text-xs">{p.name}</span>
                  {p.resource && (
                    <span className="ml-auto text-xs text-muted-foreground">{p.resource}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Role detail panel ────────────────────────────────────────────────────────

function RoleDetailPanel({
  role,
  allPermissions,
  onRoleUpdated,
}: {
  role: Role
  allPermissions: Permission[]
  onRoleUpdated: (role: Role) => void
}) {
  const qc = useQueryClient()

  const assignMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { data, error } = await apiClient.POST(
        "/api/v1/admin/iam/roles/{id}/permissions",
        {
          params: { path: { id: role.id! } },
          body: { permissionId },
        },
      )
      if (error) throw error
      return (data as { data?: Role } | undefined)?.data!
    },
    onSuccess: (updated) => {
      toast.success("Permission assigned")
      onRoleUpdated(updated)
      qc.invalidateQueries({ queryKey: ["admin", "iam", "roles"] })
    },
    onError: () => toast.error("Failed to assign permission"),
  })

  const removeMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { data, error } = await apiClient.DELETE(
        "/api/v1/admin/iam/roles/{id}/permissions/{permissionId}",
        { params: { path: { id: role.id!, permissionId } } },
      )
      if (error) throw error
      return (data as { data?: Role } | undefined)?.data ?? role
    },
    onSuccess: (updated) => {
      toast.success("Permission removed")
      onRoleUpdated(updated)
      qc.invalidateQueries({ queryKey: ["admin", "iam", "roles"] })
    },
    onError: () => toast.error("Failed to remove permission"),
  })

  const permissions = role.permissions ?? []

  // Group by resource for display
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const key = p.resource ?? "other"
    ;(acc[key] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{role.name}</h2>
        {role.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Permissions
            <span className="ml-2 text-xs text-muted-foreground">({permissions.length})</span>
          </p>
          <PermissionPicker
            allPermissions={allPermissions}
            assigned={permissions}
            onAssign={(id) => assignMutation.mutate(id)}
            isPending={assignMutation.isPending}
          />
        </div>

        {permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg bg-muted/20">
            No permissions assigned to this role yet.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
              <div key={resource}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  {resource}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => (
                    <Badge
                      key={p.id}
                      variant="secondary"
                      className="gap-1 pr-1 font-mono text-xs"
                    >
                      {p.action ?? p.name}
                      <button
                        onClick={() => removeMutation.mutate(p.id!)}
                        disabled={removeMutation.isPending}
                        className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 hover:bg-muted transition-opacity"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Permissions page ─────────────────────────────────────────────────────────

export function PermissionsPage() {
  const qc = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin", "iam", "roles"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/iam/roles", {})
      if (error) throw error
      return (data as { data?: Role[] } | undefined)?.data ?? []
    },
  })

  const { data: permissionsData } = useQuery({
    queryKey: ["admin", "iam", "permissions"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/iam/permissions", {})
      if (error) throw error
      return (data as { data?: Permission[] } | undefined)?.data ?? []
    },
  })

  const roles = rolesData ?? []
  const allPermissions = permissionsData ?? []

  // Keep selectedRole in sync when roles list updates
  useEffect(() => {
    if (selectedRole) {
      const fresh = roles.find((r) => r.id === selectedRole.id)
      if (fresh) setSelectedRole(fresh)
    }
  }, [roles]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/iam/roles/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Role deleted")
      qc.invalidateQueries({ queryKey: ["admin", "iam", "roles"] })
      setSelectedRole((prev) => (prev?.id === deleteTarget?.id ? null : prev))
      setDeleteTarget(null)
    },
    onError: () => toast.error("Failed to delete role"),
  })

  function handleRoleDialogSuccess(role: Role) {
    setDialogOpen(false)
    qc.invalidateQueries({ queryKey: ["admin", "iam", "roles"] })
    setSelectedRole(role)
  }

  function handleRoleUpdated(role: Role) {
    setSelectedRole(role)
    qc.invalidateQueries({ queryKey: ["admin", "iam", "roles"] })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Roles & permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define roles and assign permissions to control admin access.
        </p>
      </div>

      <div className="flex gap-6 min-h-[500px]">
        {/* Role list */}
        <div className="w-64 shrink-0 space-y-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => { setEditingRole(null); setDialogOpen(true) }}
          >
            <Plus className="size-4 mr-2" />
            Create role
          </Button>

          <div className="rounded-lg border bg-card overflow-hidden">
            {rolesLoading && (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!rolesLoading && roles.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No roles yet.</div>
            )}
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 cursor-pointer border-b last:border-b-0 group transition-colors",
                  selectedRole?.id === role.id
                    ? "bg-primary/8 text-primary"
                    : "hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className={cn(
                    "size-4 shrink-0",
                    selectedRole?.id === role.id ? "text-primary" : "text-muted-foreground",
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{role.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(role.permissions ?? []).length} permission{(role.permissions ?? []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div
                  className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => { setEditingRole(role); setDialogOpen(true) }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-destructive"
                    onClick={() => setDeleteTarget(role)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 rounded-lg border bg-card px-6 py-5">
          {selectedRole ? (
            <RoleDetailPanel
              role={selectedRole}
              allPermissions={allPermissions}
              onRoleUpdated={handleRoleUpdated}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a role to manage its permissions.
            </div>
          )}
        </div>
      </div>

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingRole}
        onSuccess={handleRoleDialogSuccess}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role and remove it from all users who have it assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id!)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
