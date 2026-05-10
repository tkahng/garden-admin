import { http, HttpResponse } from "msw"

export const mockCompany = {
  id: "comp0001-0000-0000-0000-000000000001",
  name: "Acme Corp",
  taxId: "12-3456789",
  taxExempt: false,
  createdAt: "2026-01-05T00:00:00.000Z",
}

export const companyHandlers = [
  http.get("http://localhost:8080/api/v1/companies", () =>
    HttpResponse.json({ data: [mockCompany] })
  ),
]
