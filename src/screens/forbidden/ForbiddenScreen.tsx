"use client"

import { LogOut, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthController } from "@/controllers/AuthController"
import { AUTH } from "@/copy/auth"
import { useAuthStore } from "@/stores/useAuthStore"

/** Signed in, but GET /v1/admin/me answered 403. */
export function ForbiddenScreen() {
  const email = useAuthStore((s) => s.user?.email ?? null)

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
            <ShieldX className="size-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{AUTH.forbiddenTitle}</CardTitle>
          <CardDescription>{AUTH.forbiddenBody(email)}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {AUTH.grantHint}{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            node dist/cli.js admin grant {email ?? "<email>"}
          </code>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => void AuthController.signOut()}>
            <LogOut />
            {AUTH.signOut}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
