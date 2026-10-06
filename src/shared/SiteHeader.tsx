import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { HeaderTrail } from "./HeaderTrail"
import { SearchButton } from "./SearchButton"
import { ThemeToggle } from "./ThemeToggle"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
      <HeaderTrail />
      <div className="ml-auto flex items-center gap-1.5">
        <SearchButton />
        <ThemeToggle />
      </div>
    </header>
  )
}
