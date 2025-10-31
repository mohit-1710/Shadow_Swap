"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/contexts/WalletContext"
import { Menu, X, Copy, RefreshCw, LogOut, ChevronDown } from "lucide-react"
import { isAdminAddress } from "@/lib/admin"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const walletDropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isDocs = pathname?.startsWith("/docs")
  const { isWalletConnected, walletAddress, connectWallet, disconnectWallet } = useWallet()
  const isAdmin = useMemo(() => isAdminAddress(walletAddress), [walletAddress])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setShowWalletDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Old: Had Trade, Orders, and Docs navigation - keeping for reference
  // const navItems = [
  //   { label: "Trade", href: "#trade" },
  //   { label: "Orders", href: "#orders" },
  //   { label: "Docs", href: "/docs" },
  // ]
  
  // Updated: Removed all nav items per user request
  const navItems: { label: string; href: string }[] = []

  const isOnTradePage = pathname === "/trade"

  // Truncate wallet address for display
  const getTruncatedAddress = () => {
    if (!walletAddress) return ""
    return `${walletAddress.slice(0, 4)}....${walletAddress.slice(-4)}`
  }

  // Copy address to clipboard
  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success("Address copied to clipboard!", { dismissible: true })
      setShowWalletDropdown(false)
    }
  }

  // Change wallet (disconnect and reconnect)
  const handleChangeWallet = async () => {
    setShowWalletDropdown(false)
    disconnectWallet()
    toast.info("Please select a different wallet", { dismissible: true })
    setTimeout(async () => {
      const success = await connectWallet()
      if (success) {
        toast.success("Wallet changed successfully", { dismissible: true })
      }
    }, 500)
  }

  // Disconnect wallet
  const handleDisconnect = () => {
    setShowWalletDropdown(false)
    disconnectWallet()
    toast.success("Wallet disconnected", { dismissible: true })
    if (isOnTradePage) {
      router.push("/")
    }
  }

  const handleWalletClick = async () => {
    // If connected, toggle dropdown
    if (isWalletConnected) {
      setShowWalletDropdown(!showWalletDropdown)
      return
    }

    // Attempt to connect wallet
    const success = await connectWallet()
    
    if (success) {
      toast.success("Connected successfully", { dismissible: true })
      // Navigate to trade page after successful connection
      router.push("/trade")
    } else {
      toast.error("Error while connecting wallet", { dismissible: true })
    }
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
            {/* Admin link for allowlisted wallets */}
            {!isDocs && isAdmin && (
              <Link
                href="/admin"
                className="text-white/80 hover:text-purple-300 transition-colors duration-200 text-sm font-medium"
              >
                Admin
              </Link>
            )}
          </nav>
          
          {/* Connect Wallet Button (hidden on docs) */}
          {!isDocs && (
          <div className="relative" ref={walletDropdownRef}>
            <div className="relative overflow-hidden">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleWalletClick} 
                className="cursor-pointer hover:scale-105 transition-transform flex items-center gap-2"
              >
                {isWalletConnected ? (
                  <>
                    <span>{getTruncatedAddress()}</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </Button>
              {/* Animated lines */}
              {!isWalletConnected && (
                <>
                  <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                  <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                </>
              )}
            </div>

            {/* Wallet Dropdown Menu */}
            {isWalletConnected && showWalletDropdown && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-[100]">
                <div className="py-1">
                  {/* Copy Address */}
                  <button
                    onClick={handleCopyAddress}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                    <span className="text-white text-sm">Copy Address</span>
                  </button>

                  {/* Change Wallet */}
                  <button
                    onClick={handleChangeWallet}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                  >
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">Change Wallet</span>
                  </button>

                  {/* Disconnect */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors text-left border-t border-white/10"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
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
                {/* Mobile Admin link for allowlisted wallets */}
                {!isDocs && isAdmin && (
                  <Link
                    href="/admin"
                    className="text-white/80 hover:text-purple-300 transition-colors duration-200 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                {!isDocs && (
                <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                  <div className="relative overflow-hidden">
                    <Button 
                      variant="default" 
                  size="sm" 
                  className="w-full cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-2" 
                  onClick={handleWalletClick}
                >
                  {isWalletConnected ? (
                    <>
                      <span>{getTruncatedAddress()}</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  ) : (
                    "Connect Wallet"
                  )}
                </Button>
                {/* Animated lines */}
                {!isWalletConnected && (
                  <>
                    <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                    <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                  </>
                )}
              </div>

              {/* Mobile Wallet Dropdown Menu */}
              {isWalletConnected && showWalletDropdown && (
                <div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl">
                  <div className="py-1">
                    {/* Copy Address */}
                    <button
                      onClick={handleCopyAddress}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                    >
                      <Copy className="w-4 h-4 text-purple-400" />
                      <span className="text-white text-sm">Copy Address</span>
                    </button>

                    {/* Change Wallet */}
                    <button
                      onClick={handleChangeWallet}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                    >
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                      <span className="text-white text-sm">Change Wallet</span>
                    </button>

                    {/* Disconnect */}
                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors text-left border-t border-white/10"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
