"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/contexts/WalletContext"
import { Menu, X, Copy, RefreshCw, LogOut, ChevronDown } from "lucide-react"
import { isAdminAddress } from "@/lib/admin"

const DevnetEnvironmentBadge = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-emerald-300 shadow-[0_3px_10px_rgba(16,185,129,0.25)] ${className}`}>
    <span className="relative flex h-2 w-2 items-center justify-center">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
    </span>
    Devnet
  </span>
)

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const walletDropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isDocs = pathname?.startsWith("/docs")
  const isAdminRoute = pathname?.startsWith("/admin")
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

  // Use X icon from public/icons/x-icon.png

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
      const result = await connectWallet()
      if (result === "success") {
        toast.success("Wallet changed successfully", { dismissible: true })
      } else if (result === "no-wallet") {
        toast.error("No wallet detected. Install a Solana wallet extension to continue.", {
          dismissible: true,
        })
      } else if (result === "error") {
        toast.error("Error while connecting wallet", { dismissible: true })
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
    const result = await connectWallet()

    if (result === "success") {
      toast.success("Connected successfully", { dismissible: true })
    } else if (result === "no-wallet") {
      toast.error("No wallet detected. Install a Solana wallet extension to continue.", {
        dismissible: true,
      })
    } else {
      toast.error("Error while connecting wallet", { dismissible: true })
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md pt-6">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-white hover:text-purple-400 transition-colors cursor-pointer font-[family-name:var(--font-instrument-serif)]">
            ShadowSwap
          </Link>
          <DevnetEnvironmentBadge className="ml-1" />
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
          <div className="flex items-center gap-3">
            {/* X link (hidden on admin route) */}
            {!isDocs && !isAdminRoute && (
              <div className="relative overflow-hidden">
                <a
                  href="https://x.com/ShadowSwapDXE"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ShadowSwap on X"
                  title="ShadowSwap on X"
                  className="x-pill relative"
                >
                  {/* The X icon inherits currentColor and animates via global theme */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* Fallback to PNG if SVG fails to load */}
                  <span className="x-logo text-white/80">
                    {/* Inline SVG to adopt theme color */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.9l-4.31-5.62L5.73 22H3l7.01-8.01L2 2h6.9l3.92 5.2L18.244 2Zm-1.21 18h2.03L7.04 4h-2.1l12.094 16Z" />
                    </svg>
                  </span>
                </a>
                {/* Purple Glitter Effect - Animated lines */}
                <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
              </div>
            )}

            {!isDocs && !isAdminRoute && (
              <div className="relative overflow-hidden">
                <a
                  href="https://github.com/mohit-1710/Shadow_Swap"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ShadowSwap on GitHub"
                  title="ShadowSwap on GitHub"
                  className="x-pill relative"
                >
                  <span className="inline-flex items-center justify-center text-white/80">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C6.475 2 2 6.588 2 12.253c0 4.515 2.865 8.342 6.839 9.697.5.095.683-.222.683-.492 0-.244-.01-1.05-.014-1.905-2.782.616-3.369-1.218-3.369-1.218-.454-1.178-1.109-1.49-1.109-1.49-.907-.635.07-.623.07-.623 1.003.072 1.531 1.062 1.531 1.062.892 1.566 2.341 1.115 2.91.852.092-.666.35-1.115.637-1.371-2.22-.26-4.555-1.133-4.555-5.041 0-1.115.389-2.027 1.028-2.743-.103-.26-.446-1.307.098-2.724 0 0 .84-.274 2.75 1.047A9.331 9.331 0 0 1 12 7.454a9.32 9.32 0 0 1 2.504.346c1.909-1.321 2.748-1.047 2.748-1.047.546 1.417.203 2.464.1 2.724.64.716 1.027 1.628 1.027 2.743 0 3.919-2.339 4.777-4.566 5.032.36.32.682.95.682 1.916 0 1.383-.013 2.497-.013 2.838 0 .272.18.59.688.49C19.138 20.592 22 16.767 22 12.253 22 6.588 17.523 2 12 2Z" />
                    </svg>
                  </span>
                </a>
                <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
              </div>
            )}
            
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
                {/* Mobile X link (hidden on admin route) */}
                {!isDocs && !isAdminRoute && (
                  <div className="relative overflow-hidden">
                    <a
                      href="https://x.com/ShadowSwapDXE"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="ShadowSwap on X"
                      title="ShadowSwap on X"
                      className="x-pill w-full justify-center py-2 relative"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="x-logo text-white/80">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                            <path d="M18.244 2H21l-6.52 7.45L22 22h-6.9l-4.31-5.62L5.73 22H3l7.01-8.01L2 2h6.9l3.92 5.2L18.244 2Zm-1.21 18h2.03L7.04 4h-2.1l12.094 16Z" />
                          </svg>
                        </span>
                        <span>Follow us on X</span>
                      </span>
                    </a>
                    {/* Purple Glitter Effect - Animated lines */}
                    <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                    <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                  </div>
                )}
                {!isDocs && !isAdminRoute && (
                  <div className="relative overflow-hidden">
                    <a
                      href="https://github.com/mohit-1710/Shadow_Swap"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="ShadowSwap on GitHub"
                      title="ShadowSwap on GitHub"
                      className="x-pill w-full justify-center py-2 relative"
                    >
                      <span className="inline-flex items-center justify-center text-white/80">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                          <path d="M12 2C6.475 2 2 6.588 2 12.253c0 4.515 2.865 8.342 6.839 9.697.5.095.683-.222.683-.492 0-.244-.01-1.05-.014-1.905-2.782.616-3.369-1.218-3.369-1.218-.454-1.178-1.109-1.49-1.109-1.49-.907-.635.07-.623.07-.623 1.003.072 1.531 1.062 1.531 1.062.892 1.566 2.341 1.115 2.91.852.092-.666.35-1.115.637-1.371-2.22-.26-4.555-1.133-4.555-5.041 0-1.115.389-2.027 1.028-2.743-.103-.26-.446-1.307.098-2.724 0 0 .84-.274 2.75 1.047A9.331 9.331 0 0 1 12 7.454a9.32 9.32 0 0 1 2.504.346c1.909-1.321 2.748-1.047 2.748-1.047.546 1.417.203 2.464.1 2.724.64.716 1.027 1.628 1.027 2.743 0 3.919-2.339 4.777-4.566 5.032.36.32.682.95.682 1.916 0 1.383-.013 2.497-.013 2.838 0 .272.18.59.688.49C19.138 20.592 22 16.767 22 12.253 22 6.588 17.523 2 12 2Z" />
                        </svg>
                      </span>
                    </a>
                    <div className="absolute top-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-top glow-purple" />
                    <div className="absolute bottom-0 h-[2px] w-[35%] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-line-bottom glow-purple" />
                  </div>
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
