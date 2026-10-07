import { Badge } from "@/components/ui/badge"
import { CAMPAIGNS } from "@/copy/campaigns"
import { isLocale, localeName, localesSourceFirst } from "@/domain/campaign"
import { type AdminCampaign } from "@/schemas/admin"
import { TableCard } from "@/shared/TableCard"

/** Each language's title and message as the campaign holds them, the source first. */
export function SentMessages({ campaign: c }: { campaign: AdminCampaign }) {
  const m = CAMPAIGNS.detail.messages
  const source = isLocale(c.sourceLanguage) ? c.sourceLanguage : "en"
  const locales = localesSourceFirst(source).filter((l) => c.messages[l])

  return (
    <TableCard title={m.title} description={m.hint}>
      <ul className="divide-y">
        {locales.map((locale) => {
          const message = c.messages[locale]!
          return (
            <li key={locale} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
              <div className="flex items-center gap-2 sm:items-start">
                <span className="text-sm font-medium">{localeName(locale)}</span>
                {locale === source ? <Badge variant="secondary">{m.source}</Badge> : null}
              </div>
              <div className="min-w-0" lang={locale} dir={locale === "ar" ? "rtl" : undefined}>
                <div className="text-sm font-medium break-words">{message.title}</div>
                <p className="text-sm break-words text-muted-foreground">{message.body}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </TableCard>
  )
}
