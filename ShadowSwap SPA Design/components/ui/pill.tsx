import * as React from "react"
import { cn } from "@/lib/utils"

interface PillProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error"
}

const Pill = React.forwardRef<HTMLDivElement, PillProps>(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "accent-line inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        "border border-white/10 backdrop-blur-sm",
        variant === "default" && "bg-golden/10 text-golden",
        variant === "success" && "bg-green-500/10 text-green-400",
        variant === "warning" && "bg-yellow-500/10 text-yellow-400",
        variant === "error" && "bg-red-500/10 text-red-400",
        className,
      )}
      {...props}
    />
  )
})
Pill.displayName = "Pill"

export { Pill }
