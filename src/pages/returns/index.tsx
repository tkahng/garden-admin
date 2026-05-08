import { useState } from "react"
import { Link } from "@tanstack/react-router"
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
import { toast } from "sonner"

type ReturnRequest = components["schemas"]["ReturnRequestResponse"]
type ReviewReturnRequest = components["schemas"]["ReviewReturnRequest"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | undefined) {
  return iso ? new Date(iso).toLocaleDateString() : "—"
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING:   { label: "Pending",   variant: "secondary" },
  APPROVED:  { label: "Approved",  variant: "default" },
  REJECTED:  { label: "Rejected",  variant: "destructive" },
  COMPLETED: { label: "Completed", variant: "outline" },
}

const REASON_LABEL: Record<string, string> = {
  DAMAGED: "Damaged",
  WRONG_ITEM: "Wrong item",
  NOT_AS_DESCRIBED: "Not as described",
  CHANGED_MIND: "Changed mind",
  OTHER: "Other",
}

const RESOLUTION_LABEL: Record<string, string> = {
  REFUND: "Refund",
  EXCHANGE: "Exchange",
  STORE_CREDIT: "Store credit",
}

// ─── Review dialog ────────────────────────────────────────────────────────────

function ReviewDialog({
  open,
  onOpenChange,
  rr,
  action,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  rr: ReturnRequest | null
  action: "approve" | "reject"
  onSuccess: () => void
}) {
  const [staffNotes, setStaffNotes] = useState("")

  const mutation = useMutation({
    mutationFn: async (body: ReviewReturnRequest | undefined) => {
      if (!rr?.id) return
      if (action === "approve") {
        const { error } = await apiClient.POST("/api/v1/admin/returns/{id}/approve", {
          params: { path: { id: rr.id } },
          body: body as ReviewReturnRequest,
        })
        if (error) throw error
      } else {
        const { error } = await apiClient.POST("/api/v1/admin/returns/{id}/reject", {
          params: { path: { id: rr.id } },
          body: body as ReviewReturnRequest,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(action === "approve" ? "Return approved" : "Return rejected")
      setStaffNotes("")
      onSuccess()
    },
    onError: () => toast.error("Action failed"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{action === "approve" ? "Approve return" : "Reject return"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Staff notes (optional)</Label>
            <Input
              placeholder="Add a note for the customer…"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={action === "approve" ? "default" : "destructive"}
            onClick={() => mutation.mutate(staffNotes ? { staffNotes } : undefined)}
            disabled={mutation.isPending}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Returns table ────────────────────────────────────────────────────────────

function ReturnRow({
  rr,
  onReview,
  onComplete,
}: {
  rr: ReturnRequest
  onReview: (rr: ReturnRequest, action: "approve" | "reject") => void
  onComplete: (id: string) => void
}) {
  const badge = STATUS_BADGE[rr.status ?? ""] ?? { label: rr.status, variant: "outline" as const }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">{rr.id?.slice(0, 8)}…</TableCell>
      <TableCell>
        {rr.orderId ? (
          <Link
            to="/orders/$orderId"
            params={{ orderId: rr.orderId }}
            className="font-mono text-xs text-primary hover:underline"
          >
            #{rr.orderId.slice(0, 8).toUpperCase()}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm">{REASON_LABEL[rr.reason ?? ""] ?? rr.reason}</TableCell>
      <TableCell className="text-sm">{RESOLUTION_LABEL[rr.resolution ?? ""] ?? rr.resolution}</TableCell>
      <TableCell>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{fmt(rr.createdAt)}</TableCell>
      <TableCell>
        <div className="flex gap-1 justify-end">
          {rr.status === "PENDING" && (
            <>
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onReview(rr, "approve")}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => onReview(rr, "reject")}>
                Reject
              </Button>
            </>
          )}
          {rr.status === "APPROVED" && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => rr.id && onComplete(rr.id)}>
              Complete
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Returns page ─────────────────────────────────────────────────────────────

export function ReturnsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [reviewing, setReviewing] = useState<{ rr: ReturnRequest; action: "approve" | "reject" } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "returns", statusFilter],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/admin/returns", {
        params: {
          query: {
            status: statusFilter !== "ALL"
              ? (statusFilter as ReturnRequest["status"])
              : undefined,
            size: 100,
          },
        },
      })
      if (error) throw error
      return (data as { data?: { content?: ReturnRequest[] } } | undefined)?.data?.content ?? []
    },
  })

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.POST("/api/v1/admin/returns/{id}/complete", {
        params: { path: { id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Return completed")
      void qc.invalidateQueries({ queryKey: ["admin", "returns"] })
    },
    onError: () => toast.error("Failed to complete return"),
  })

  const returns = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Returns</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead className="w-32">Order</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-32">Resolution</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Created</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {!isLoading && returns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No return requests.</TableCell>
              </TableRow>
            )}
            {returns.map((rr) => (
              <ReturnRow
                key={rr.id}
                rr={rr}
                onReview={(r, action) => setReviewing({ rr: r, action })}
                onComplete={(id) => completeMutation.mutate(id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <ReviewDialog
        open={!!reviewing}
        onOpenChange={(v) => !v && setReviewing(null)}
        rr={reviewing?.rr ?? null}
        action={reviewing?.action ?? "approve"}
        onSuccess={() => {
          setReviewing(null)
          void qc.invalidateQueries({ queryKey: ["admin", "returns"] })
        }}
      />
    </div>
  )
}
