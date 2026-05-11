import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { apiClient } from "@/api/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Store, CheckCircle, XCircle } from "lucide-react"

export function VerifyEmailPage({ token }: { token: string }) {
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending")

  useEffect(() => {
    apiClient.GET("/api/v1/auth/verify-email", { params: { query: { token } } })
      .then(({ error }) => {
        setStatus(error ? "error" : "success")
      })
      .catch(() => setStatus("error"))
  }, [token])

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
            <CardTitle className="text-base">Email verification</CardTitle>
            <CardDescription>
              {status === "pending" && "Verifying your email address..."}
              {status === "success" && "Your email has been verified."}
              {status === "error" && "Verification failed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "pending" && (
              <p className="text-sm text-muted-foreground">Please wait...</p>
            )}
            {status === "success" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <CheckCircle className="size-10 text-green-500" />
                <p className="text-sm text-muted-foreground text-center">
                  Your email address has been confirmed. You can now sign in.
                </p>
                <Link to="/login" search={{ redirect_to: undefined }} className="text-sm text-primary hover:underline">
                  Go to sign in →
                </Link>
              </div>
            )}
            {status === "error" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <XCircle className="size-10 text-destructive" />
                <p className="text-sm text-muted-foreground text-center">
                  This verification link is invalid or has already been used.
                </p>
                <Link to="/login" search={{ redirect_to: undefined }} className="text-sm text-primary hover:underline">
                  Back to sign in →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
