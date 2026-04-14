import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { apiClient, setAuthToken } from "@/api/client"

const USER_KEY = "garden_user"

interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? (JSON.parse(stored) as AuthUser) : null
    } catch {
      return null
    }
  })
  const [refreshToken, setRefreshToken] = useState<string>("")

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await apiClient.POST("/api/v1/auth/login", {
      body: { email, password },
    })
    if (error) throw new Error("Login failed")
    if (data) {
      const d = data as { id?: unknown; email?: string; firstName?: string; lastName?: string; data?: { refreshToken?: string; accessToken?: string } }
      setAuthToken(d.data?.accessToken ?? "")
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
    setAuthToken("")
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
