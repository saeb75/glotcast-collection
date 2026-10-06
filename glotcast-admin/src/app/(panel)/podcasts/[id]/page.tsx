"use client"

import { use } from "react"
import { PodcastEditorScreen } from "@/screens/podcast-editor/PodcastEditorScreen"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PodcastEditorScreen id={id} />
}
