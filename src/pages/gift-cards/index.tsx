import { useState } from "react"
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
import { Plus, Power, Search } from "lucide-react"
import { toast } from "sonner"
import { DataPagination } from "@/components/ui/data-pagination"

type GiftCard = components["schemas"]["GiftCardResponse"]
type CreateGiftCard = components["schemas"]["CreateGiftCardRequest"]

const PAGE_SIZE = 20

export function GiftCardsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateGiftCard>>({ currency: "USD" })

  const { page: rawPage, codeContains } = useSearch({ from: "/_authenticated/gift-cards" })
  const page = rawPage ?? 0
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "gift-cards", page, codeContains],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/gift-cards", {
        params: { query: { page, size: PAGE_SIZE, codeContains: codeContains || undefined } },
      })
      if (error) throw error
      return data
    },
  })

  const cards: GiftCard[] = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function setPage(newPage: number) {
    void navigate({ to: "/gift-cards", search: { page: newPage, codeContains }, replace: true })
  }

  const createMutation = useMutation({
    mutationFn: async (body: CreateGiftCard) => {
      const { error } = await apiClient.POST("/api/v1/admin/gift-cards", { body })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Gift card created")
      qc.invalidateQueries({ queryKey: ["admin", "gift-cards"] })
      setOpen(false)
      setForm({ currency: "USD" })
    },
    onError: () => toast.error("Failed to create gift card"),
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PUT("/api/v1/admin/gift-cards/{id}/deactivate", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Gift card deactivated")
      qc.invalidateQueries({ queryKey: ["admin", "gift-cards"] })
    },
    onError: () => toast.error("Failed to deactivate gift card"),
  })

  function handleSubmit() {
    if (!form.initialBalance) {
      toast.error("Initial balance is required")
      return
    }
    createMutation.mutate({ initialBalance: form.initialBalance, ...form } as CreateGiftCard)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gift cards</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" />
          Issue gift card
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code..."
            className="pl-9"
            value={codeContains ?? ""}
            onChange={(e) => {
              void navigate({
                to: "/gift-cards",
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
              <TableHead>Initial</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && cards.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No gift cards yet.
                </TableCell>
              </TableRow>
            )}
            {cards.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell>${(c.initialBalance ?? 0).toFixed(2)}</TableCell>
                <TableCell className="font-medium">${(c.currentBalance ?? 0).toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground">{c.recipientEmail ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "No expiry"}
                </TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {c.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      title="Deactivate"
                      onClick={() => deactivateMutation.mutate(c.id!)}
                    >
                      <Power className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (
          <DataPagination page={page} totalPages={totalPages} total={total} label="gift card" onPageChange={setPage} />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue gift card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Initial balance ($)</Label>
              <Input
                type="number"
                min={0}
                placeholder="50.00"
                value={form.initialBalance ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, initialBalance: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code (leave blank to auto-generate)</Label>
              <Input
                placeholder="Optional"
                value={form.code ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recipient email</Label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={form.recipientEmail ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expires at</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt?.slice(0, 16) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: new Date(e.target.value).toISOString() }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                placeholder="Optional"
                value={form.note ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
