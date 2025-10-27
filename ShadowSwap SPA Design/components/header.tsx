"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { label: "Trade", href: "#trade" },
    { label: "Orders", href: "#orders" },
    { label: "Portfolio", href: "#portfolio" },
    { label: "Docs", href: "#docs" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-golden clip-corner" />
          <span className="text-xl font-bold text-white">ShadowSwap</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-white/70 hover:text-golden transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
          <Button variant="default" size="sm">
            Connect Wallet
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white hover:text-golden transition-colors"
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
              <a
                key={item.label}
                href={item.href}
                className="text-white/70 hover:text-golden transition-colors duration-200 py-2"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Sign In
              </Button>
              <Button variant="default" size="sm" className="w-full">
                Connect Wallet
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
