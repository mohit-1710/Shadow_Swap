"use client"

import Link from "next/link"
import { ParticleBackground } from "./particle-background"
import { Button } from "@/components/ui/button"
import { Pill } from "@/components/ui/pill"

export function Hero() {
  return (
    // Old: <section className="relative w-full h-[70vh] min-h-[600px] overflow-hidden bg-black pt-4">
    <section className="relative w-full h-screen min-h-screen overflow-hidden bg-black pt-4">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-6 text-center">
        {/* Old: <div className="relative -translate-y-6 sm:-translate-y-10 md:-translate-y-12 transition-transform duration-300"> */}
        <div className="relative w-full flex flex-col items-center -translate-y-16 sm:-translate-y-20 md:-translate-y-28 transition-transform duration-300">
        {/* Reverted to original single line format for better spacing */}
        <Pill className="mb-6 glow-purple">
          <span className="text-purple-400 text-glow-purple">New</span> Privacy-First Trading on Solana
        </Pill>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 text-balance leading-tight">
          Trade with <span className="text-purple-400 text-glow-purple">Privacy</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 mb-8 max-w-2xl text-balance leading-relaxed">
          The privacy-preserving orderbook DEX on Solana. Execute trades without exposing your positions to the mempool.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link href="/trade">
            <Button size="lg" variant="default" className="cursor-pointer hover:scale-105 transition-transform">
              Start Trade
            </Button>
          </Link>
          
          {/* Old: Static button without link - keeping for reference
          <Button size="lg" variant="outline" className="cursor-pointer hover:scale-105 transition-transform">
            Read Docs
          </Button>
          */}
          
          {/* Updated: Link to docs page */}
          <Link href="/docs">
            <Button size="lg" variant="outline" className="cursor-pointer hover:scale-105 transition-transform">
              Read Docs
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 text-center max-w-4xl">
          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-400">$2.4M</div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">24h Volume</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-400">1,200+</div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">Active Traders</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-400">0ms</div>
            <div className="text-xs sm:text-sm text-white/50 mt-1">MEV Protection</div>
          </div>
        </div>
        </div>
      </div>

      {/* Mouse scroll indicator */}
      <div className="absolute bottom-32 sm:bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center animate-subtle-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-purple-400/40 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-purple-400 rounded-full animate-scroll-down"></div>
        </div>
      </div>
    </section>
  )
}
