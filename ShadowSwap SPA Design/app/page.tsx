import { Hero } from "@/components/hero"
import { OrdersSection } from "@/components/orders-section"

export default function Home() {
  return (
    <main className="min-h-screen bg-background scroll-smooth">
      <section id="hero">
        <Hero />
      </section>
      <section id="orders" className="min-h-[30vh]">
        <OrdersSection />
      </section>
    </main>
  )
}
