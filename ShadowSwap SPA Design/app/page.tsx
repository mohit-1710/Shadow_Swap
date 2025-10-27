import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { TradeSection } from "@/components/trade-section"
import { OrdersSection } from "@/components/orders-section"
import { PortfolioSection } from "@/components/portfolio-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <TradeSection />
      <OrdersSection />
      <PortfolioSection />
      <Footer />
    </main>
  )
}
