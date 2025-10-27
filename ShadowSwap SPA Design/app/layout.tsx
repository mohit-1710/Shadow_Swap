import type React from "react"
import type { Metadata } from "next"
import { Inter, Roboto_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Inter({ subsets: ["latin"], display: 'swap' })
const geistMono = Roboto_Mono({ subsets: ["latin"], display: 'swap' })

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
      <body className={`${geistSans.className} bg-background text-foreground`}>{children}</body>
    </html>
  )
}
