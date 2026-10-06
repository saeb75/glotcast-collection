"use client"

import { Crown } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { UsersController } from "@/controllers/UsersController"
import { USERS } from "@/copy/users"
import { type UserProfile } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { useUsersStore } from "@/stores/useUsersStore"

/** Backend Pro: granting is one click, removing asks first. */
export function FeatureAccessCard({ user }: { user: UserProfile }) {
  const saving = useUsersStore((s) => s.saving[user.id] ?? false)
  const [confirming, setConfirming] = useState(false)
  const d = USERS.detail

  const toggle = (next: boolean) => {
    if (next) void UsersController.setFeatureAccess(user.id, true)
    else setConfirming(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="size-4" />
          {d.access}
        </CardTitle>
        <CardDescription>{d.accessHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
          <span className="text-sm font-medium">{user.featureAccess ? d.accessOn : d.accessOff}</span>
          <span className="flex items-center gap-2">
            {saving ? <Spinner /> : null}
            <Switch checked={user.featureAccess} disabled={saving} onCheckedChange={toggle} aria-label={d.access} />
          </span>
        </label>
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={d.revokeTitle}
        description={d.revokeBody(user.email ?? user.name ?? USERS.guest)}
        confirmLabel={d.revoke}
        onConfirm={() => UsersController.setFeatureAccess(user.id, false)}
      />
    </Card>
  )
}
