import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  size?: "sm" | "default" | "lg"
}

export function Spinner({ className, size = "default" }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-primary/30 border-t-primary",
        size === "sm" && "h-4 w-4",
        size === "default" && "h-5 w-5",
        size === "lg" && "h-8 w-8",
        className
      )}
    />
  )
}
