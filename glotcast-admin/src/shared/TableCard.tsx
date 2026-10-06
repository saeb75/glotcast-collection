import { type ReactNode } from "react"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * A card holding a table (or a list) edge to edge: title, one line of context and actions on top, the rows
 * under a rule, an optional footer (paging, load more).
 */
export function TableCard({
  title,
  description,
  actions,
  toolbar,
  footer,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Filters between the header and the rows. */
  toolbar?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      {title ? (
        <CardHeader className="py-4">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
          {actions ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
      ) : null}
      {toolbar ? <div className={cn("px-4 pb-4", !title && "pt-4")}>{toolbar}</div> : null}
      <div className="border-t">{children}</div>
      {footer ? <div className="border-t">{footer}</div> : null}
    </Card>
  )
}
