import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Loader({ size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3",
    lg: "w-16 h-16 border-4",
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "rounded-full border-purple-400/30 border-t-purple-400 animate-spin glow-purple",
          sizeClasses[size]
        )}
      />
    </div>
  )
}

export function LoaderFullScreen() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass p-8 rounded-lg">
        <Loader size="lg" />
        <p className="text-white/60 text-sm mt-4 text-center">Loading...</p>
      </div>
    </div>
  )
}

export function LoaderInline({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader size="md" />
      {text && <p className="text-white/60 text-sm mt-4">{text}</p>}
    </div>
  )
}

