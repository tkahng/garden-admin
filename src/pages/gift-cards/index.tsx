import { useState } from "react"
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
import { Plus, Power } from "lucide-react"
import { toast } from "sonner"

type GiftCard = components["schemas"]["GiftCardResponse"]
type CreateGiftCard = components["schemas"]["CreateGiftCardRequest"]

const PAGE_SIZE = 20

export function GiftCardsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<CreateGiftCard>>({ currency: "USD" })
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "gift-cards", page],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/gift-cards", {
        params: { query: { page, size: PAGE_SIZE } },
      })
      if (error) throw error
      return data
    },
  })

  const cards: GiftCard[] = data?.data?.content ?? []
  const total = data?.data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

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
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{total} gift card{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span>Page {page + 1} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
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
