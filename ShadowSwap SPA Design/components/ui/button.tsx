import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "clip-corner font-medium transition-all duration-200 relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
          "after:absolute after:top-0 after:left-0 after:w-full after:h-0.5 after:bg-gradient-to-r after:from-purple-500 after:to-transparent",
          "after:bottom-0 after:right-0 after:w-0.5 after:h-full after:bg-gradient-to-b after:from-purple-500 after:to-transparent",
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "md" && "px-4 py-2 text-base",
          size === "lg" && "px-6 py-3 text-lg",
          variant === "default" && "bg-purple-500 text-white hover:bg-purple-600 hover:glow-purple-strong active:scale-95",
          variant === "outline" && "border border-purple-500 text-purple-400 hover:bg-purple-500/10 hover:glow-purple active:scale-95",
          variant === "ghost" && "text-white hover:bg-white/10 active:scale-95",
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button }
