import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, Search } from "lucide-react"
import { downloadCsv } from "@/lib/download"
import { bulkSuspendUsers, bulkReactivateUsers } from "@/lib/bulk-api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import { DataPagination } from "@/components/ui/data-pagination"

const PAGE_SIZE = 20

export function CustomersPage() {
  const { page: rawPage, email } = useSearch({ from: "/_authenticated/customers" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    setSelectedIds(new Set())
  }

  const bulkSuspendMutation = useMutation({
    mutationFn: () => bulkSuspendUsers([...selectedIds]),
    onSuccess: invalidate,
  })

  const bulkReactivateMutation = useMutation({
    mutationFn: () => bulkReactivateUsers([...selectedIds]),
    onSuccess: invalidate,
  })

  function toggleAll() {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map((u) => String(u.id))))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function setPage(newPage: number) {
    setSelectedIds(new Set())
    void navigate({ to: "/customers", search: { page: newPage, email }, replace: true })
  }

  const allChecked = users.length > 0 && selectedIds.size === users.length
  const someChecked = selectedIds.size > 0 && selectedIds.size < users.length
  const isBusy = bulkSuspendMutation.isPending || bulkReactivateMutation.isPending

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

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => bulkReactivateMutation.mutate()}
          >
            Reactivate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isBusy}
            onClick={() => {
              if (confirm(`Suspend ${selectedIds.size} customer(s)?`)) {
                bulkSuspendMutation.mutate()
              }
            }}
          >
            Suspend
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  data-state={someChecked ? "indeterminate" : allChecked ? "checked" : "unchecked"}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No customers found</TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const id = String(u.id)
              const checked = selectedIds.has(id)
              return (
                <TableRow key={id} data-state={checked ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOne(id)}
                      aria-label={`Select ${u.email ?? id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link to="/customers/$customerId" params={{ customerId: id }} className="font-medium hover:underline">
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
              )
            })}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="customer" onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
