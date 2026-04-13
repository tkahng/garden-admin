import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { apiClient } from "@/api/client"

interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await apiClient.POST("/api/v1/auth/login", {
      body: { email, password },
    })
    if (error) throw new Error("Login failed")
    if (data) {
      setUser({
        id: String((data as { id?: unknown }).id ?? ""),
        email: (data as { email?: string }).email ?? email,
        firstName: (data as { firstName?: string }).firstName,
        lastName: (data as { lastName?: string }).lastName,
      })
    }
  }, [])

  const logout = useCallback(async () => {
    await apiClient.POST("/api/v1/auth/logout", {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
