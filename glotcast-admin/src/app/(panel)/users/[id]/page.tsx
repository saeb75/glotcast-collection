"use client"

import { use } from "react"
import { UserDetailScreen } from "@/screens/user-detail/UserDetailScreen"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UserDetailScreen id={id} />
}
