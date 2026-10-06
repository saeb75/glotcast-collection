import { FileQuestion } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NAV_COPY } from "@/copy/nav"
import { EmptyState } from "@/shared/EmptyState"

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <EmptyState
        icon={FileQuestion}
        title={NAV_COPY.notFoundTitle}
        description={NAV_COPY.notFoundBody}
        action={
          <Button asChild variant="outline">
            <Link href="/">{NAV_COPY.backHome}</Link>
          </Button>
        }
      />
    </div>
  )
}
