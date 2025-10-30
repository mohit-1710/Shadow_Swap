"use client"

import { Shield, DollarSign, Eye, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"

const features = [
  {
    icon: Shield,
    title: "MEV Protection",
    description: "Stop sandwich attacks and front-running before they happen. Your trades execute at fair prices, protected from malicious bots.",
    stat: "$500M+",
    statLabel: "Saved from MEV annually",
  },
  {
    icon: DollarSign,
    title: "Zero Hidden Costs",
    description: "Batch matching eliminates MEV losses and unnecessary slippage. Pay only transparent fees with no hidden extractive costs.",
    stat: "0%",
    statLabel: "MEV tax on trades",
  },
  {
    icon: Eye,
    title: "Complete Transparency",
    description: "Every transfer is verifiable on-chain. Full audit trail with cryptographic proofs while keeping your strategy private.",
    stat: "100%",
    statLabel: "On-chain verification",
  },
  {
    icon: Zap,
    title: "Lightning Fast Settlement",
    description: "Execute trades in under a second leveraging Solana's high-speed infrastructure. No delays, no missed opportunities.",
    stat: "<1s",
    statLabel: "Average execution time",
  },
]

const stats = [
  { value: "$2.4M+", label: "Total Volume" },
  { value: "200+", label: "Active Traders" },
  { value: "0 ms", label: "MEV Protection" },
]

export function FeaturesSection() {
  return (
    <section className="relative py-16 sm:py-24 px-4 bg-black overflow-hidden">
      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Why ShadowSwap?
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto">
            The first privacy-preserving orderbook DEX on Solana. Trade with confidence knowing your positions are protected from MEV and front-running.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="group relative p-6 sm:p-8 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                {/* Icon */}
                <div className="mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Stat */}
                <div className="pt-4 border-t border-white/10">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">
                    {feature.stat}
                  </div>
                  <div className="text-xs sm:text-sm text-white/50">
                    {feature.statLabel}
                  </div>
                </div>

              </Card>
            )
          })}
        </div>

        {/* Bottom Stats Row */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-12 md:gap-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-400 mb-2">
                {stat.value}
              </div>
              <div className="text-sm sm:text-base text-white/50">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

