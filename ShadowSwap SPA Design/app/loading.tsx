import { LoaderInline } from "@/components/ui/loader"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoaderInline text="Loading..." />
    </div>
  )
}

