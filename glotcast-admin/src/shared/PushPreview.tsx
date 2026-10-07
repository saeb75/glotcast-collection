"use client"

import { useState } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CAMPAIGNS } from "@/copy/campaigns"
import { LOCALES, localeName, type MessageDraft, messageFor, messageProblem } from "@/domain/campaign"
import { formatLockScreenDay } from "@/domain/format"
import { type Locale } from "@/schemas/admin"
import { BrandMark } from "./BrandMark"
import { OptionSelect } from "./OptionSelect"

const BY_NAME = [...LOCALES].sort((a, b) => localeName(a).localeCompare(localeName(b)))

/** An image that disappears when it fails to load (a pasted URL may be wrong). */
function PreviewImage({ url, className }: { url: string; className: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (failed === url) return null
  return <img src={url} alt="" className={className} onError={() => setFailed(url)} />
}

/**
 * The push on an iPhone lock screen, in a chosen language — with the fallback the API applies (English, then
 * the source) when that language has no text. Collapsed, and expanded when there is an image.
 */
export function PushPreview({
  messages,
  source,
  imageUrl,
  language,
  onLanguage,
}: {
  messages: Partial<Record<string, MessageDraft>>
  source: Locale
  imageUrl: string | null
  language: Locale
  onLanguage: (language: Locale) => void
}) {
  const p = CAMPAIGNS.editor.preview
  const found = messageFor(messages, language, source)
  const label = (l: Locale) =>
    messageProblem(messages[l]) === null ? localeName(l) : `${localeName(l)} · ${p.missingSuffix}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.title}</CardTitle>
        <CardDescription>{p.hint}</CardDescription>
        <CardAction>
          <OptionSelect
            label={p.language}
            value={language}
            options={BY_NAME}
            labels={label}
            onChange={onLanguage}
            className="h-7 w-40 text-xs"
          />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-hidden rounded-[1.75rem] bg-linear-to-b from-[#3b1d0e] via-[#8a3a14] to-[#ee8146] p-3 pb-4 shadow-inner dark:from-[#150b06] dark:via-[#4a1f0b] dark:to-[#b94d17]">
          <div className="pt-3 pb-5 text-center text-white">
            <div className="text-xs font-medium opacity-85">{formatLockScreenDay(new Date())}</div>
            <div className="text-5xl leading-tight font-semibold tracking-tight tabular-nums">{p.clock}</div>
          </div>
          {found ? (
            <div
              className="space-y-2"
              lang={found.language}
              dir={found.language === "ar" ? "rtl" : undefined}
            >
              <div className="flex items-start gap-2.5 rounded-2xl bg-white/80 p-2.5 text-neutral-900 shadow-lg backdrop-blur-xl dark:bg-neutral-900/75 dark:text-neutral-50">
                <BrandMark className="size-9 rounded-[0.6rem]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">{found.message.title}</span>
                    <span className="shrink-0 text-[11px] opacity-60">{p.now}</span>
                  </div>
                  <p className="line-clamp-4 text-[13px] leading-snug break-words">{found.message.body}</p>
                </div>
                {imageUrl ? (
                  <PreviewImage url={imageUrl} className="size-9 shrink-0 rounded-md object-cover" />
                ) : null}
              </div>
              {imageUrl ? (
                <>
                  <div className="px-1 pt-1 text-[11px] font-medium text-white/80">{p.expanded}</div>
                  <div className="overflow-hidden rounded-2xl bg-white/80 text-neutral-900 shadow-lg backdrop-blur-xl dark:bg-neutral-900/75 dark:text-neutral-50">
                    <PreviewImage url={imageUrl} className="aspect-[2/1] w-full object-cover" />
                    <div className="p-2.5">
                      <div className="text-[13px] font-semibold">{found.message.title}</div>
                      <p className="text-[13px] leading-snug break-words">{found.message.body}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/40 p-4 text-center text-xs text-white/80">
              {p.empty}
            </div>
          )}
        </div>
        {found && found.language !== language ? (
          <p className="text-xs text-muted-foreground">
            {p.fallback(localeName(language), localeName(found.language))}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
