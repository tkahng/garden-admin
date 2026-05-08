import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { components } from "@/schema"
import { useNavigate } from "@tanstack/react-router"

type Company = components["schemas"]["CompanyResponse"]

export function CompaniesPage() {
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/companies", {})
      if (error) throw error
      return (data as { data?: Company[] } | undefined)?.data ?? []
    },
  })

  const companies = data ?? []
  const filtered = search
    ? companies.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()))
    : companies

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Button
          size="sm"
          onClick={() => void navigate({ to: "/companies/$companyId", params: { companyId: "new" } })}
        >
          <Plus className="size-4 mr-2" />
          Add company
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Tax ID</TableHead>
              <TableHead>Tax exempt</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  {search ? "No companies match your search." : "No companies found."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: c.id! }}
                    className="font-medium hover:underline"
                  >
                    {c.name ?? "Unnamed"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">
                  {c.taxId ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {c.taxExempt ? (
                    <span className="text-green-600 font-medium">Exempt</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
