"use client"

import { use } from "react"
import { CampaignScreen } from "@/screens/campaign-detail/CampaignScreen"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CampaignScreen id={id} />
}
