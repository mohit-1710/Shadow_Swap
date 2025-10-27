"use client"

import { ParticleBackground } from "./particle-background"
import { Button } from "@/components/ui/button"
import { Pill } from "@/components/ui/pill"

export function Hero() {
  return (
    <section className="relative w-full h-screen overflow-hidden bg-black pt-20">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        <Pill className="mb-6">
          <span className="text-golden">New</span> Privacy-First Trading on Solana
        </Pill>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 text-balance leading-tight">
          Trade with <span className="text-golden">Privacy</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 mb-8 max-w-2xl text-balance leading-relaxed">
          The privacy-preserving orderbook DEX on Solana. Execute trades without exposing your positions to the mempool.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Button size="lg" variant="default">
            Launch App
          </Button>
          <Button size="lg" variant="outline">
            Read Docs
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-12 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-golden">$2.4M</div>
            <div className="text-sm text-white/50 mt-1">24h Volume</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-golden">1,200+</div>
            <div className="text-sm text-white/50 mt-1">Active Traders</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-golden">0ms</div>
            <div className="text-sm text-white/50 mt-1">MEV Protection</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 border-2 border-golden/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-golden rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
