"use client"

import { use } from "react"
import { EpisodeEditorScreen } from "@/screens/episode-editor/EpisodeEditorScreen"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <EpisodeEditorScreen id={id} />
}
