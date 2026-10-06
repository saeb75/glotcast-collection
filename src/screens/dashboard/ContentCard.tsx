import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DASHBOARD } from "@/copy/dashboard"
import { formatCount, formatShare } from "@/domain/format"
import { type Dashboard } from "@/schemas/admin"

/** Published vs drafts (and scheduled), as a split bar. */
export function ContentCard({ episodes }: { episodes: Dashboard["episodes"] | undefined }) {
  const total = episodes ? episodes.published + episodes.drafts : 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD.content}</CardTitle>
        <CardDescription>{DASHBOARD.contentHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!episodes ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-chart-1"
                style={{ width: total ? `${(episodes.published / total) * 100}%` : 0 }}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-chart-1" />
                  {DASHBOARD.live}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatCount(episodes.published)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatShare(episodes.published, total)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  {DASHBOARD.drafts}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatCount(episodes.drafts)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatShare(episodes.drafts, total)}
                  </span>
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
      <CardFooter className="gap-2 border-t">
        <Button variant="outline" size="sm" asChild>
          <Link href="/episodes?status=draft">{DASHBOARD.drafts}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/episodes">{DASHBOARD.openEpisodes}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
