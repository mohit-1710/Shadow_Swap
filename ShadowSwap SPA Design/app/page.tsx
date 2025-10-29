import { Hero } from "@/components/hero"
import { OrdersSection } from "@/components/orders-section"
import { FeaturesSection } from "@/components/features-section"
import { ScrollReveal } from "@/components/scroll-reveal"

/**
 * Landing Page with Scroll Reveal Animations
 * 
 * Each section reveals with parallax effect as user scrolls:
 * - Hero: Reveals immediately on page load (delay: 0ms)
 * - Orders: Reveals when scrolled 20% into viewport (delay: 100ms)
 * - Features: Reveals when scrolled 20% into viewport (delay: 200ms)
 * 
 * Animation details:
 * - Initial: blur(6px) + opacity(0) + translateY(50px)
 * - Final: blur(0) + opacity(1) + translateY(0)
 * - Timing: opacity(0.8s) + blur(0.6s) + transform(0.7s) [faster reveal]
 * - Parallax: Content lags behind scroll for smooth effect
 * 
 * Performance optimizations:
 * - Intersection Observer API (no constant scroll listening)
 * - RequestAnimationFrame for smooth parallax
 * - Passive event listeners
 * - Respects prefers-reduced-motion
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background scroll-smooth">
      {/* OLD: <section id="hero"><Hero /></section> */}
      {/* Hero Section: Reveals on page load with no delay */}
      <ScrollReveal delay={0} threshold={0.1}>
        <section id="hero">
          <Hero />
        </section>
      </ScrollReveal>

      {/* OLD: <section id="orders" className="min-h-[30vh]"><OrdersSection /></section> */}
      {/* Orders Section: Reveals when 20% visible, with 100ms stagger */}
      <ScrollReveal delay={100} threshold={0.2}>
        <section id="orders" className="min-h-[30vh]">
          <OrdersSection />
        </section>
      </ScrollReveal>

      {/* OLD: <section id="features"><FeaturesSection /></section> */}
      {/* Features Section: Reveals when 20% visible, with 200ms stagger */}
      <ScrollReveal delay={200} threshold={0.2}>
        <section id="features">
          <FeaturesSection />
        </section>
      </ScrollReveal>
    </main>
  )
}

/**
 * HOW TO REVERT SCROLL REVEAL:
 * 
 * 1. Remove ScrollReveal import at top
 * 2. Unwrap each <ScrollReveal> component (see // OLD: comments above)
 * 3. Restore original <section> tags directly
 * 4. Delete components/scroll-reveal.tsx file
 * 
 * Example:
 * <ScrollReveal><section id="hero"><Hero /></section></ScrollReveal>
 * ↓
 * <section id="hero"><Hero /></section>
 */
