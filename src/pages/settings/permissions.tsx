import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export function PermissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "iam", "roles"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/iam/roles", {})
      if (error) throw error
      return data
    },
  })

  const roles = (data as { content?: unknown[] } | undefined)?.content ?? (Array.isArray(data) ? data : [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users & permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage roles and assign permissions to control admin access.
          </p>
        </div>
        <Button size="sm">
          <Plus className="size-4 mr-2" />
          Create role
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-12">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-12">
                  No roles defined
                </TableCell>
              </TableRow>
            )}
            {roles.map((r: Record<string, unknown>) => (
              <TableRow key={String(r.id)}>
                <TableCell className="font-medium">{String(r.name ?? "Unnamed")}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(r.permissions) ? r.permissions : []).map(
                      (p: unknown, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {String(typeof p === "object" && p !== null ? (p as Record<string, unknown>).name ?? p : p)}
                        </Badge>
                      )
                    )}
                    {(!Array.isArray(r.permissions) || r.permissions.length === 0) && (
                      <span className="text-muted-foreground text-sm">No permissions</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
