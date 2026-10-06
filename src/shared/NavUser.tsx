"use client"

import { ChevronsUpDown, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { AuthController } from "@/controllers/AuthController"
import { AUTH } from "@/copy/auth"
import { APP } from "@/copy/common"
import { useAuthStore } from "@/stores/useAuthStore"
import { UserAvatar } from "./UserAvatar"

/** The signed-in admin at the foot of the sidebar; the menu signs out. */
export function NavUser() {
  const email = useAuthStore((s) => s.user?.email ?? null)
  const { isMobile } = useSidebar()

  const who = (
    <>
      <UserAvatar name={email} size="sm" className="rounded-lg" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{email}</span>
        <span className="truncate text-xs text-muted-foreground">{APP.area}</span>
      </div>
    </>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              {who}
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">{who}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void AuthController.signOut()}>
              <LogOut />
              {AUTH.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
