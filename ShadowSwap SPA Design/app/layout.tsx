import type React from "react"
import type { Metadata } from "next"
import { Inter, Roboto_Mono, Instrument_Serif } from "next/font/google"
import { Header } from "@/components/header"
import { WalletProvider } from "@/contexts/WalletContext"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Inter({ subsets: ["latin"], display: 'swap' })
const geistMono = Roboto_Mono({ subsets: ["latin"], display: 'swap' })
const instrumentSerif = Instrument_Serif({ 
  subsets: ["latin"], 
  weight: ["400"],
  display: 'swap',
  variable: '--font-instrument-serif'
})

export const metadata: Metadata = {
  title: "ShadowSwap - Privacy-Preserving DEX",
  description: "Trade with privacy on Solana",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${instrumentSerif.variable} bg-background text-foreground`}>
        <WalletProvider>
          <Header />
          {children}
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  )
}
