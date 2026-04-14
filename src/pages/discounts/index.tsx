import { useEffect, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Discount = components["schemas"]["DiscountResponse"]
type CreateDiscount = components["schemas"]["CreateDiscountRequest"]

const PAGE_SIZE = 20

function typeLabel(type: string | undefined) {
  switch (type) {
    case "PERCENTAGE": return "Percentage"
    case "FIXED_AMOUNT": return "Fixed amount"
    case "FREE_SHIPPING": return "Free shipping"
    default: return type ?? "—"
  }
}

function valueDisplay(d: Discount) {
  if (d.type === "PERCENTAGE") return `${d.value}%`
  if (d.type === "FIXED_AMOUNT") return `$${(d.value ?? 0).toFixed(2)} off`
  if (d.type === "FREE_SHIPPING") return "Free shipping"
  return "—"
}

export function DiscountsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateDiscount>>({ type: "PERCENTAGE" })

  const { page: rawPage, codeContains } = useSearch({ from: "/_authenticated/discounts" })
  const page = rawPage ?? 0
  const navigate = useNavigate()
  const [codeInput, setCodeInput] = useState(codeContains ?? "")

  useEffect(() => { setCodeInput(codeContains ?? "") }, [codeContains])

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "discounts", page, codeContains],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/discounts", {
        params: { query: { page, size: PAGE_SIZE, codeContains: codeContains || undefined } },
      })
      if (error) throw error
      return data
    },
  })

  const discounts: Discount[] = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/discounts", search: { page: newPage, codeContains }, replace: true })
  }

  const createMutation = useMutation({
    mutationFn: async (body: CreateDiscount) => {
      const { error } = await apiClient.POST("/api/v1/admin/discounts", { body })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Discount created")
      qc.invalidateQueries({ queryKey: ["admin", "discounts"] })
      setOpen(false)
      setForm({ type: "PERCENTAGE" })
    },
    onError: () => toast.error("Failed to create discount"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/api/v1/admin/discounts/{id}", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Discount deleted")
      qc.invalidateQueries({ queryKey: ["admin", "discounts"] })
    },
    onError: () => toast.error("Failed to delete discount"),
  })

  function handleSubmit() {
    if (!form.code || !form.type || form.value == null) {
      toast.error("Code, type and value are required")
      return
    }
    createMutation.mutate(form as CreateDiscount)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Discounts</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" />
          Create discount
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code..."
            className="pl-9"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value)
              void navigate({
                to: "/discounts",
                search: { page: 0, codeContains: e.target.value || undefined },
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
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && discounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No discounts yet.
                </TableCell>
              </TableRow>
            )}
            {discounts.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono font-medium">{d.code}</TableCell>
                <TableCell>{typeLabel(d.type)}</TableCell>
                <TableCell>{valueDisplay(d)}</TableCell>
                <TableCell>
                  {d.usedCount ?? 0}
                  {d.maxUses != null && ` / ${d.maxUses}`}
                </TableCell>
                <TableCell>
                  <Badge variant={d.isActive ? "default" : "secondary"}>
                    {d.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.startsAt ? new Date(d.startsAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.endsAt ? new Date(d.endsAt).toLocaleDateString() : "No end"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => deleteMutation.mutate(d.id!)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} discount{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                placeholder="SUMMER20"
                value={form.code ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as CreateDiscount["type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type !== "FREE_SHIPPING" && (
              <div className="space-y-1.5">
                <Label>Value {form.type === "PERCENTAGE" ? "(%)" : "($)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.value ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min order ($)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={form.minOrderAmount ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max uses</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.maxUses ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starts at</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: new Date(e.target.value).toISOString() }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ends at</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: new Date(e.target.value).toISOString() }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
