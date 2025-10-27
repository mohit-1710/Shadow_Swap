"use client"

import { Button } from "@/components/ui/button"
import { Github, Twitter, Linkedin, Mail } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    Product: [
      { label: "Features", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Security", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
    Resources: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Community", href: "#" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Press", href: "#" },
    ],
    Legal: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Cookies", href: "#" },
      { label: "Disclaimer", href: "#" },
    ],
  }

  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-golden clip-corner" />
              <span className="text-xl font-bold text-white">ShadowSwap</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Privacy-preserving orderbook DEX on Solana. Trade without compromise.
            </p>
            <div className="flex gap-3 mt-6">
              <a href="#" className="text-white/60 hover:text-golden transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-white/60 hover:text-golden transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-white/60 hover:text-golden transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-white/60 hover:text-golden transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-white/60 hover:text-golden transition-colors text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-12">
          <h3 className="text-lg font-semibold text-white mb-2">Stay Updated</h3>
          <p className="text-white/60 text-sm mb-4">
            Get the latest updates on new features and trading opportunities.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-golden"
            />
            <Button variant="default" size="sm">
              Subscribe
            </Button>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">© {currentYear} ShadowSwap. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-white/60 hover:text-golden transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-white/60 hover:text-golden transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-white/60 hover:text-golden transition-colors">
              Cookie Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
