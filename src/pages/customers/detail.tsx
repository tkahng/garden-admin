import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ArrowLeft, X, Plus, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"

type Role = components["schemas"]["RoleResponse"]
type User = components["schemas"]["AdminUserResponse"]

// ─── Roles card ───────────────────────────────────────────────────────────────

function RolesCard({ userId, assignedRoleNames }: { userId: string; assignedRoleNames: string[] }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: allRoles } = useQuery({
    queryKey: ["admin", "iam", "roles"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/iam/roles", {})
      if (error) throw error
      return (data as { data?: Role[] } | undefined)?.data ?? []
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (roleName: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/users/{id}/roles", {
        params: { path: { id: userId } },
        body: { roleName },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Role assigned")
      void qc.invalidateQueries({ queryKey: ["admin", "users", userId] })
    },
    onError: () => toast.error("Failed to assign role"),
  })

  const removeMutation = useMutation({
    mutationFn: async (roleName: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/users/{id}/roles/{roleName}", {
        params: { path: { id: userId, roleName } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Role removed")
      void qc.invalidateQueries({ queryKey: ["admin", "users", userId] })
    },
    onError: () => toast.error("Failed to remove role"),
  })

  const assignedSet = new Set(assignedRoleNames)
  const available = (allRoles ?? []).filter((r) => r.name && !assignedSet.has(r.name))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Roles</CardTitle>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={available.length === 0}
              >
                <Plus className="size-3 mr-1" />
                Add role
                <ChevronsUpDown className="size-3 ml-1 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search roles…" />
                <CommandList>
                  <CommandEmpty>No roles available.</CommandEmpty>
                  <CommandGroup>
                    {available.map((r) => (
                      <CommandItem
                        key={r.id}
                        value={r.name ?? ""}
                        onSelect={() => {
                          assignMutation.mutate(r.name!)
                          setOpen(false)
                        }}
                      >
                        <span className="font-medium text-sm">{r.name}</span>
                        {r.description && (
                          <span className="ml-2 text-xs text-muted-foreground truncate">{r.description}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5 min-h-8">
          {assignedRoleNames.length === 0 && (
            <span className="text-sm text-muted-foreground">No roles assigned.</span>
          )}
          {assignedRoleNames.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1 font-normal">
              {name}
              <button
                onClick={() => removeMutation.mutate(name)}
                disabled={removeMutation.isPending}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 hover:bg-muted transition-opacity"
                aria-label={`Remove ${name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomerDetailPage({ id }: { id: string }) {
  const qc = useQueryClient()
  const [tagInput, setTagInput] = useState("")
  const [notes, setNotes] = useState<string | undefined>(undefined)
  const [notesDirty, setNotesDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/users/{id}", {
        params: { path: { id: id! } },
      })
      if (error) throw error
      const user = (data as { data?: User } | undefined)?.data
      setNotes((prev) => prev === undefined ? (user?.adminNotes ?? "") : prev)
      return user
    },
    enabled: !!id,
  })

  const user = data as User | undefined

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/users/{id}/suspend", {
        params: { path: { id: id! } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("User suspended")
      qc.invalidateQueries({ queryKey: ["admin", "users", id] })
    },
    onError: () => toast.error("Failed to suspend user"),
  })

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PUT("/api/v1/admin/users/{id}/reactivate", {
        params: { path: { id: id! } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("User reactivated")
      qc.invalidateQueries({ queryKey: ["admin", "users", id] })
    },
    onError: () => toast.error("Failed to reactivate user"),
  })

  const tagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const { error } = await apiClient.PUT("/api/v1/admin/users/{id}/tags", {
        params: { path: { id: id! } },
        body: { tags },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Tags updated")
      qc.invalidateQueries({ queryKey: ["admin", "users", id] })
    },
    onError: () => toast.error("Failed to update tags"),
  })

  const notesMutation = useMutation({
    mutationFn: async (adminNotes: string) => {
      const { error } = await apiClient.PUT("/api/v1/admin/users/{id}/notes", {
        params: { path: { id: id! } },
        body: { adminNotes },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Notes saved")
      setNotesDirty(false)
      qc.invalidateQueries({ queryKey: ["admin", "users", id] })
    },
    onError: () => toast.error("Failed to save notes"),
  })

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || (user?.tags ?? []).includes(trimmed)) return
    tagsMutation.mutate([...(user?.tags ?? []), trimmed])
    setTagInput("")
  }

  function removeTag(tag: string) {
    tagsMutation.mutate((user?.tags ?? []).filter((t) => t !== tag))
  }

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email}
          </h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          {user?.status === "SUSPENDED" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              Reactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
            >
              Suspend
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Email", user?.email],
              ["Phone", user?.phone],
              ["Status", user?.status],
              ["Joined", user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"],
              ["Verified", user?.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleDateString() : "Not verified"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span>
                  {label === "Status" ? (
                    <Badge variant={
                      value === "ACTIVE" ? "default" :
                      value === "SUSPENDED" ? "destructive" : "secondary"
                    }>
                      {value ?? "—"}
                    </Badge>
                  ) : (value ?? "—")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(user?.tags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded hover:bg-muted"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              {(user?.tags ?? []).length === 0 && (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                className="h-8 text-sm"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput) }
                }}
              />
              <Button size="sm" variant="outline" onClick={() => addTag(tagInput)}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles */}
      <RolesCard userId={id} assignedRoleNames={user?.roles ?? []} />

      {/* Admin notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Internal notes visible only to admins..."
            className="min-h-24 resize-none"
            value={notes ?? ""}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesDirty(true)
            }}
          />
          {notesDirty && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotes(user?.adminNotes ?? "")
                  setNotesDirty(false)
                }}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => notesMutation.mutate(notes ?? "")}
                disabled={notesMutation.isPending}
              >
                Save notes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
