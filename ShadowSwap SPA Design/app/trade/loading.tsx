import { LoaderInline } from "@/components/ui/loader"

export default function TradeLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="glass p-12 rounded-lg clip-corner">
        <LoaderInline text="Loading trading interface..." />
      </div>
    </div>
  )
}

