import { Link } from "@tanstack/react-router"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export function CustomersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/users", {})
      if (error) throw error
      return data
    },
  })

  const users = (data as { content?: Record<string, unknown>[] } | undefined)?.content ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  No customers found
                </TableCell>
              </TableRow>
            )}
            {users.map((u: Record<string, unknown>) => (
              <TableRow key={String(u.id)}>
                <TableCell>
                  <Link to="/customers/$customerId" params={{ customerId: String(u.id) }} className="font-medium hover:underline">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || String(u.email ?? "—")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{String(u.email ?? "—")}</TableCell>
                <TableCell>
                  <Badge variant={u.suspended ? "destructive" : "default"}>
                    {u.suspended ? "Suspended" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {u.createdAt ? new Date(u.createdAt as string).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
