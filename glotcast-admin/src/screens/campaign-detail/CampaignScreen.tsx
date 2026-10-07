"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CampaignsController } from "@/controllers/CampaignsController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { ERRORS } from "@/copy/common"
import { CampaignEditorScreen } from "@/screens/campaign-editor/CampaignEditorScreen"
import { ErrorState } from "@/shared/ErrorState"
import { PageHeader } from "@/shared/PageHeader"
import { useCampaignsStore } from "@/stores/useCampaignsStore"
import { CampaignDetailScreen } from "./CampaignDetailScreen"

/** /notifications/:id — a draft opens the editor; anything sent (or on its way) its results. */
export function CampaignScreen({ id }: { id: string }) {
  const entry = useCampaignsStore((s) => s.details[id])
  const campaign = entry?.data

  useEffect(() => {
    void CampaignsController.loadCampaign(id)
  }, [id])

  if (entry?.error && !campaign)
    return (
      <>
        <PageHeader
          title={CAMPAIGNS.title}
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications">
                <ArrowLeft />
                {CAMPAIGNS.detail.back}
              </Link>
            </Button>
          }
        />
        <ErrorState
          message={entry.error === ERRORS.not_found ? CAMPAIGNS.editor.notFound : entry.error}
          onRetry={() => void CampaignsController.loadCampaign(id, true)}
        />
      </>
    )

  if (!campaign)
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )

  return campaign.status === "draft" ? (
    <CampaignEditorScreen campaign={campaign} />
  ) : (
    <CampaignDetailScreen campaign={campaign} />
  )
}
