"use client"

import { Shield, Lock, ArrowLeftRight, ExternalLink as Route } from "lucide-react"

interface StepProps {
  step: string
  title: string
  description: string
  icon: React.ElementType
}

function StepCard({ step, title, description, icon: Icon }: StepProps) {
  return (
    <div className="group relative flex flex-col items-start justify-start gap-3 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition-all cursor-default shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-500/15 border border-purple-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
        </div>
        <div>
          <div className="text-xs text-purple-400 font-mono tracking-wide">{step}</div>
          <div className="text-white font-semibold text-lg leading-tight">{title}</div>
        </div>
      </div>
      <p className="text-white/70 text-sm leading-relaxed">{description}</p>

      {/* Accent glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_0_1px_rgba(168,85,247,0.25)]"></div>
    </div>
  )
}

export default function FlowDiagram() {
  return (
    <div className="w-full mb-10 md:mb-12">
      <h3 className="text-2xl md:text-3xl font-semibold text-white/90 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-purple-500 rounded-full" />
        Order Flow Overview
      </h3>

      {/* Grid + responsive connectors */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5">
          <StepCard
            step="Step 1"
            title="You Submit an Order"
            description="Frontend encrypts side, price and amount into a 512-byte cipher, then submits the encrypted blob on-chain."
            icon={Lock}
          />
          <StepCard
            step="Step 2"
            title="Private Matching"
            description="Keeper fetches encrypted orders; Arcium MPC decrypts privately; matching engine pairs compatible orders by price-time priority."
            icon={Shield}
          />
          <StepCard
            step="Step 3"
            title="Settlement"
            description="Atomic token transfers between buyer and seller escrows; you receive tokens at the executed price."
            icon={ArrowLeftRight}
          />
          <StepCard
            step="Step 4"
            title="Fallback (Optional)"
            description="If no private match within your timeout, route to public liquidity (e.g., Jupiter) with reduced privacy."
            icon={Route}
          />
        </div>

        {/* Arrows - hidden on small screens, shown on md+ */}
        <div className="hidden md:block absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
            {/* Smooth arrows between 4 columns */}
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5.2" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="rgba(168,85,247,0.8)" />
              </marker>
            </defs>
            <path d="M12,10 C15,10 17,10 20,10" stroke="rgba(168,85,247,0.6)" strokeWidth="0.6" fill="none" markerEnd="url(#arrow)" />
            <path d="M37,10 C40,10 42,10 45,10" stroke="rgba(168,85,247,0.6)" strokeWidth="0.6" fill="none" markerEnd="url(#arrow)" />
            <path d="M62,10 C65,10 67,10 70,10" stroke="rgba(168,85,247,0.6)" strokeWidth="0.6" fill="none" markerEnd="url(#arrow)" />
          </svg>
        </div>
      </div>
    </div>
  )
}
