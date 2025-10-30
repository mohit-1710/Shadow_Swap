"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/contexts/WalletContext"
import { isAdminAddress } from "@/lib/admin"
import { Menu, X } from "lucide-react"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { isWalletConnected, walletAddress, connectWallet, disconnectWallet, wallet } = useWallet()
  const currentAddress = wallet.publicKey?.toBase58() || walletAddress
  const isAdmin = isAdminAddress(currentAddress)

  // Old: Had Trade, Orders, and Docs navigation - keeping for reference
  // const navItems = [
  //   { label: "Trade", href: "#trade" },
  //   { label: "Orders", href: "#orders" },
  //   { label: "Docs", href: "/docs" },
  // ]
  
  // Updated: Removed all nav items per user request
  const navItems: { label: string; href: string }[] = []

  const isOnTradePage = pathname === "/trade"

  const handleWalletClick = async () => {
    // If on trade page and connected, disconnect the wallet
    if (isWalletConnected && isOnTradePage) {
      disconnectWallet()
      toast.success("Wallet disconnected")
      router.push("/")
      return
    }

    // If connected, navigate to trade page (admin opens panel via link)
    if (isWalletConnected) {
      router.push("/trade")
      return
    }

    // Attempt to connect wallet
    const success = await connectWallet()
    
    if (success) {
      toast.success("Connected successfully")
      // Always go to trade; admins can click Admin link to open panel
      router.push("/trade")
    } else {
      toast.error("Error while connecting wallet")
    }
  }

  const getButtonText = () => {
    if (!isWalletConnected) return "Connect Wallet"
    if (isOnTradePage) return "Disconnect Wallet"
    return "Start Trading"
  }

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md pt-6">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold text-white hover:text-purple-400 transition-colors cursor-pointer font-[family-name:var(--font-instrument-serif)]">
            ShadowSwap
          </Link>
        </div>
        {/* Desktop Navigation & Buttons */}
        <div className="hidden md:flex items-center gap-6">
          {/* Desktop Nav Links */}
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              item.href.startsWith('#') ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-white/70 hover:text-purple-400 transition-colors duration-200 text-sm font-medium"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-white/70 hover:text-purple-400 transition-colors duration-200 text-sm font-medium"
                >
                  {item.label}
                </Link>
              )
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-white/80 hover:text-purple-400 transition-colors duration-200 text-sm font-medium"
              >
                Admin
              </Link>
            )}
          </nav>
          
          {/* Connect Wallet Button */}
          <div className="relative overflow-hidden">
            <Button variant="default" size="sm" onClick={handleWalletClick} className="cursor-pointer hover:scale-105 transition-transform">
              {getButtonText()}
            </Button>
            {/* Animated lines */}
            {!isWalletConnected && (
              <>
                <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white hover:text-purple-400 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur-md">
          <nav className="flex flex-col gap-4 p-4">
            {navItems.map((item) => (
              item.href.startsWith('#') ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-white/70 hover:text-purple-400 transition-colors duration-200 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-white/70 hover:text-purple-400 transition-colors duration-200 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              )
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-white/80 hover:text-purple-400 transition-colors duration-200 py-2"
                onClick={() => setIsOpen(false)}
              >
                Admin
              </Link>
            )}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <div className="relative overflow-hidden">
                <Button variant="default" size="sm" className="w-full cursor-pointer hover:scale-105 transition-transform" onClick={handleWalletClick}>
                  {getButtonText()}
                </Button>
                {/* Animated lines */}
                {!isWalletConnected && (
                  <>
                    <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                    <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
