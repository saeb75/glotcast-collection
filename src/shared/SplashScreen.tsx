import { Spinner } from "@/components/ui/spinner"

/** Full-page wait: the stored session is read, or the admin check runs. */
export function SplashScreen({ label }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <Spinner className="size-5" />
      {label ? <span>{label}</span> : null}
    </div>
  )
}
