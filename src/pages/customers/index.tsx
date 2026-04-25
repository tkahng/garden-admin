import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { downloadCsv } from "@/lib/download"
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
import { DataPagination } from "@/components/ui/data-pagination"

const PAGE_SIZE = 20

export function CustomersPage() {
  const { page: rawPage, email } = useSearch({ from: "/_authenticated/customers" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (email) params.set("email", email)
      const qs = params.toString()
      await downloadCsv(`/api/v1/admin/users/export${qs ? `?${qs}` : ""}`, "customers.csv")
    } finally {
      setExporting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, email],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/users", {
        params: { query: { page, size: PAGE_SIZE, email: email || undefined } },
      })
      if (error) throw error
      return data
    },
  })

  const users = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/customers", search: { page: newPage, email }, replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 size-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            className="pl-9"
            value={email ?? ""}
            onChange={(e) => {
              void navigate({
                to: "/customers",
                search: { page: 0, email: e.target.value || undefined },
                replace: true,
              })
            }}
          />
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
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">No customers found</TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={String(u.id)}>
                <TableCell>
                  <Link to="/customers/$customerId" params={{ customerId: String(u.id) }} className="font-medium hover:underline">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || String(u.email ?? "—")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{String(u.email ?? "—")}</TableCell>
                <TableCell>
                  <Badge variant={u.status === "SUSPENDED" ? "destructive" : "default"}>
                    {String(u.status ?? "ACTIVE")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {u.createdAt ? new Date(u.createdAt as string).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="customer" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
