import { UserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/domain/format"
import { cn } from "@/lib/utils"

/** The user's picture, else initials; a person icon for a guest. */
export function UserAvatar({
  name,
  imageUrl,
  size = "default",
  className,
}: {
  name: string | null
  imageUrl?: string | null
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  const letters = initials(name)
  return (
    <Avatar size={size} className={className}>
      {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
      <AvatarFallback className={cn("font-medium", !letters && "text-muted-foreground")}>
        {letters || <UserRound className="size-4" />}
      </AvatarFallback>
    </Avatar>
  )
}
