import { Link } from "react-router"
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

export function LocationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/locations", {})
      if (error) throw error
      return data
    },
  })

  const locations = (data as { content?: Record<string, unknown>[] } | undefined)?.content ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <Button asChild size="sm">
          <Link to="/settings/locations/new">
            <Plus className="size-4 mr-2" />
            Add location
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && locations.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                  No locations added
                </TableCell>
              </TableRow>
            )}
            {locations.map((l: Record<string, unknown>) => (
              <TableRow key={String(l.id)}>
                <TableCell>
                  <Link to={`/settings/locations/${l.id}`} className="font-medium hover:underline">
                    {String(l.name ?? "Unnamed")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {String(l.address ?? "—")}
                </TableCell>
                <TableCell>
                  <Badge variant={l.active ? "default" : "secondary"}>
                    {l.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
