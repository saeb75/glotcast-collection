import { CircleAlert, RotateCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { COMMON } from "@/copy/common"

/** A failed load, with its reason and a retry. */
export function ErrorState({
  title = COMMON.loadFailed,
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message ? <p>{message}</p> : null}
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RotateCw />
            {COMMON.retry}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
