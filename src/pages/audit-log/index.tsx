import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { auditLogApi, type AuditLogEntry } from "@/lib/audit-api"
import { Input } from "@/components/ui/input"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { DataPagination } from "@/components/ui/data-pagination"
import { Search, X } from "lucide-react"

const PAGE_SIZE = 25

const ENTITY_TYPES = [
  "product",
  "discount",
  "order",
  "user",
  "collection",
  "quote",
  "invoice",
  "return",
]

function entityTypeBadgeVariant(type: string): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "order": return "default"
    case "product": return "secondary"
    case "discount": return "outline"
    case "return": return "destructive"
    default: return "outline"
  }
}

function formatAction(action: string) {
  return action
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function DetailDrawer({
  entry,
  open,
  onClose,
}: {
  entry: AuditLogEntry | null
  open: boolean
  onClose: () => void
}) {
  if (!entry) return null
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit entry</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          <Row label="ID" value={entry.id} mono />
          <Row label="Time" value={new Date(entry.createdAt).toLocaleString()} />
          <Row label="Actor" value={entry.actorEmail ?? entry.actorId ?? "—"} />
          <Row label="Action" value={formatAction(entry.action)} />
          <Row label="Entity type" value={entry.entityType} />
          <Row label="Entity ID" value={entry.entityId ?? "—"} mono />
          {entry.beforeJson && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Before</p>
              <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-48">
                {(() => {
                  let parsed;
                  try { parsed = JSON.parse(entry.beforeJson); } catch { parsed = entry.beforeJson; }
                  return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
                })()}
              </pre>
            </div>
          )}
          {entry.afterJson && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">After</p>
              <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-48">
                {(() => {
                  let parsed;
                  try { parsed = JSON.parse(entry.afterJson); } catch { parsed = entry.afterJson; }
                  return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
                })()}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs break-all" : ""}>{value}</span>
    </div>
  )
}

export function AuditLogPage() {
  const [page, setPage] = useState(0)
  const [entityType, setEntityType] = useState("")
  const [actorEmail, setActorEmail] = useState("")
  const [actorEmailInput, setActorEmailInput] = useState("")
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", page, entityType, actorEmail],
    queryFn: () =>
      auditLogApi.list({
        entityType: entityType || undefined,
        actorEmail: actorEmail || undefined,
        page,
        size: PAGE_SIZE,
      }),
  })

  const entries = data?.content ?? []
  const total = data?.meta.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function applyEmailFilter() {
    setActorEmail(actorEmailInput)
    setPage(0)
  }

  function clearFilters() {
    setEntityType("")
    setActorEmail("")
    setActorEmailInput("")
    setPage(0)
  }

  const hasFilters = !!entityType || !!actorEmail

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Admin actions recorded by entity type and actor.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select
            value={entityType || "all"}
            onValueChange={(v) => { setEntityType(v === "all" ? "" : v); setPage(0) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Actor email"
            value={actorEmailInput}
            onChange={(e) => setActorEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyEmailFilter()}
            className="w-56"
          />
          <Button variant="outline" size="icon" onClick={applyEmailFilter}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity type</TableHead>
              <TableHead>Entity ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Loading…
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No audit entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(e)}
                >
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{e.actorEmail ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatAction(e.action)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entityTypeBadgeVariant(e.entityType)}>
                      {e.entityType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.entityId ? e.entityId.slice(0, 8) + "…" : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          total={total}
          label="entries"
          onPageChange={setPage}
        />
      )}

      <DetailDrawer
        entry={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
