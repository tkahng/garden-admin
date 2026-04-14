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
  const [refreshToken, setRefreshToken] = useState<string>("")

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await apiClient.POST("/api/v1/auth/login", {
      body: { email, password },
    })
    if (error) throw new Error("Login failed")
    if (data) {
      const d = data as { id?: unknown; email?: string; firstName?: string; lastName?: string; data?: { refreshToken?: string; accessToken?: string } }
      setRefreshToken(d.data?.refreshToken ?? "")
      setUser({
        id: String(d.id ?? ""),
        email: d.email ?? email,
        firstName: d.firstName,
        lastName: d.lastName,
      })
    }
  }, [])

  const logout = useCallback(async () => {
    await apiClient.POST("/api/v1/auth/logout", { body: { refreshToken } })
    setUser(null)
    setRefreshToken("")
  }, [refreshToken])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
