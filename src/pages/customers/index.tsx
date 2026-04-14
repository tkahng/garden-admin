import { useEffect, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const PAGE_SIZE = 20

export function CustomersPage() {
  const { page: rawPage, email } = useSearch({ from: "/_authenticated/customers" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [emailInput, setEmailInput] = useState(email ?? "")

  useEffect(() => { setEmailInput(email ?? "") }, [email])

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
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            className="pl-9"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value)
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
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} customer{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>Previous</Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
