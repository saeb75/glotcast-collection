"use client"

import { use } from "react"
import { ListDetailScreen } from "@/screens/list-detail/ListDetailScreen"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ListDetailScreen id={id} />
}
