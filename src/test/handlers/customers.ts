import { http, HttpResponse } from "msw"

export const mockCustomer = {
  id: "user-001-0000-0000-0000-000000000001",
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  phone: "+15550001",
  status: "ACTIVE",
  createdAt: "2026-01-15T10:00:00.000Z",
  emailVerifiedAt: "2026-01-16T10:00:00.000Z",
  tags: ["vip", "wholesale"],
  adminNotes: "Important customer",
  roles: ["admin"],
}

export const mockRoles = [
  { id: "role-1", name: "admin", description: "Administrator" },
  { id: "role-2", name: "editor", description: "Content editor" },
]

export const customerHandlers = [
  http.get("http://localhost:8080/api/v1/admin/users", () =>
    HttpResponse.json({
      data: {
        content: [mockCustomer],
        meta: { total: 1, page: 0, size: 20 },
      },
    })
  ),

  http.get("http://localhost:8080/api/v1/admin/users/:id", () =>
    HttpResponse.json({ data: mockCustomer })
  ),

  http.put("http://localhost:8080/api/v1/admin/users/:id/suspend", () =>
    HttpResponse.json({ data: { ...mockCustomer, status: "SUSPENDED" } })
  ),

  http.put("http://localhost:8080/api/v1/admin/users/:id/reactivate", () =>
    HttpResponse.json({ data: { ...mockCustomer, status: "ACTIVE" } })
  ),

  http.put("http://localhost:8080/api/v1/admin/users/:id/tags", () =>
    HttpResponse.json({ data: mockCustomer })
  ),

  http.put("http://localhost:8080/api/v1/admin/users/:id/notes", () =>
    HttpResponse.json({ data: mockCustomer })
  ),

  http.get("http://localhost:8080/api/v1/admin/iam/roles", () =>
    HttpResponse.json({ data: mockRoles })
  ),

  http.post("http://localhost:8080/api/v1/admin/users/:id/roles", () =>
    HttpResponse.json({ data: { ...mockCustomer, roles: ["admin", "editor"] } })
  ),

  http.delete("http://localhost:8080/api/v1/admin/users/:id/roles/:roleName", () =>
    HttpResponse.json({ data: { ...mockCustomer, roles: [] } })
  ),
]
