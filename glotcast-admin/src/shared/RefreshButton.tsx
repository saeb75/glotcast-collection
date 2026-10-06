import { RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { COMMON } from "@/copy/common"
import { cn } from "@/lib/utils"

/** Reload the page's data; the icon spins while it loads. */
export function RefreshButton({ loading, onRefresh }: { loading?: boolean; onRefresh: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onRefresh}>
      <RotateCw className={cn(loading && "animate-spin")} />
      {COMMON.refresh}
    </Button>
  )
}
