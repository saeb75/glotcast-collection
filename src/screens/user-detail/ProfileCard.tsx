import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LEVEL_LABELS } from "@/copy/status"
import { USERS } from "@/copy/users"
import { formatDateTime, formatRelative } from "@/domain/format"
import { type UserProfile } from "@/schemas/admin"
import { CopyButton } from "@/shared/CopyButton"
import { DetailItem } from "@/shared/DetailItem"

const dash = (value: string | null | undefined) => (value ? value : "—")

/** What the user told the app (onboarding answers) and their account. */
export function ProfileCard({ user: u }: { user: UserProfile }) {
  const f = USERS.detail.fields
  return (
    <Card>
      <CardHeader>
        <CardTitle>{USERS.detail.profile}</CardTitle>
        <CardDescription>{USERS.detail.profileHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <DetailItem label={f.id}>
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {u.id}
              <CopyButton value={u.id} />
            </span>
          </DetailItem>
          <DetailItem label={f.email}>{dash(u.email)}</DetailItem>
          <DetailItem label={f.name}>{dash(u.name)}</DetailItem>
          <DetailItem label={f.type}>{u.isAnonymous ? USERS.guest : USERS.detail.registered}</DetailItem>
          <DetailItem label={f.level}>{LEVEL_LABELS[u.level]}</DetailItem>
          <DetailItem label={f.native}>{dash(u.nativeLanguage)}</DetailItem>
          <DetailItem label={f.ui}>{dash(u.uiLanguage)}</DetailItem>
          <DetailItem label={f.translation}>{dash(u.translationLanguage)}</DetailItem>
          <DetailItem label={f.goal}>{USERS.detail.minutes(u.dailyGoalMin)}</DetailItem>
          <DetailItem label={f.interests}>{u.interests.length ? u.interests.join(", ") : "—"}</DetailItem>
          <DetailItem label={f.motivation}>
            {u.motivation ? (USERS.detail.motivations[u.motivation] ?? u.motivation) : "—"}
          </DetailItem>
          <DetailItem label={f.reminder}>{dash(u.reminderTime)}</DetailItem>
          <DetailItem label={f.created}>{formatDateTime(u.createdAt)}</DetailItem>
          <DetailItem label={f.seen} hint={f.seenHint}>
            {formatRelative(u.lastSeenAt)}
          </DetailItem>
          {u.legacyStrapiUserId !== null ? <DetailItem label={f.legacy}>#{u.legacyStrapiUserId}</DetailItem> : null}
        </dl>
      </CardContent>
    </Card>
  )
}
