import * as React from "react"
import { cn } from "@/lib/utils"

interface PillProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error"
}

const Pill = React.forwardRef<HTMLDivElement, PillProps>(({ className, variant = "default", ...props }, ref) => {
  // OLD: Always used "accent-line" class with purple color
  // NEW: Determine the line color class based on variant
  // - Success (Filled status) → Green lines
  // - Error (Canceled status) → Red lines
  // - Warning (Ongoing status) → Purple lines
  // - Default → Purple lines
  const getAccentLineClass = () => {
    switch (variant) {
      case "success":
        return "accent-line-green"
      case "error":
        return "accent-line-red"
      case "warning":
      case "default":
      default:
        return "accent-line-purple"
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "accent-line inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        "border border-white/10 backdrop-blur-sm",
        getAccentLineClass(), // Apply variant-specific line color
        variant === "default" && "bg-purple-500/10 text-purple-400",
        variant === "success" && "bg-green-500/10 text-green-400",
        variant === "warning" && "bg-purple-500/10 text-purple-400",
        variant === "error" && "bg-red-500/10 text-red-400",
        className,
      )}
      {...props}
    />
  )
})
Pill.displayName = "Pill"

export { Pill }
