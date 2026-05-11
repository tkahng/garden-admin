import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"
import { apiClient } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Store, ArrowLeft } from "lucide-react"

export function ResetPasswordPage({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      await apiClient.POST("/api/v1/auth/confirm-password-reset/{token}", {
        params: { path: { token } },
        body: { newPassword, confirmPassword },
      })
      setDone(true)
    } catch {
      setError("This reset link is invalid or has expired.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary flex size-10 items-center justify-center rounded-xl">
            <Store className="text-primary-foreground size-5" />
          </div>
          <h1 className="text-xl font-semibold">Garden Admin</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Set new password</CardTitle>
            <CardDescription>
              {done ? "Your password has been updated." : "Choose a new password for your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
                <Link to="/login" search={{ redirect_to: undefined }} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <ArrowLeft className="size-3.5" />
                  Go to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : "Set new password"}
                </Button>
                <Link to="/login" search={{ redirect_to: undefined }} className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
