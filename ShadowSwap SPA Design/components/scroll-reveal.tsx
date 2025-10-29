"use client"

import { useEffect, useRef, useState } from "react"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  threshold?: number
}

/**
 * ScrollReveal Component
 * 
 * Provides smooth scroll-triggered reveal animation with parallax effect.
 * 
 * Animation phases:
 * 1. Initial (hidden): blur(6px) + opacity(0) + translateY(50px)
 * 2. Final (revealed): blur(0) + opacity(1) + translateY(0)
 * 3. Timing: opacity(0.8s) + blur(0.6s) + transform(0.7s) for snappier reveal
 * 
 * Features:
 * - Uses Intersection Observer API for performance
 * - Parallax/lag effect: content moves slower than scroll speed
 * - Mobile-optimized with reduced motion support
 * - Only animates once when entering viewport
 * 
 * @param children - Content to be revealed
 * @param className - Additional CSS classes
 * @param delay - Animation delay in milliseconds (default: 0)
 * @param threshold - Viewport intersection threshold 0-1 (default: 0.2)
 */
export function ScrollReveal({ 
  children, 
  className = "", 
  delay = 0,
  threshold = 0.2 
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    // Intersection Observer for reveal trigger
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            // Trigger reveal when section enters viewport
            setIsVisible(true)
          }
        })
      },
      {
        threshold: threshold,
        rootMargin: "0px 0px -10% 0px", // Trigger slightly before element fully enters
      }
    )

    observer.observe(element)

    // Parallax scroll effect (throttled for performance)
    let ticking = false
    const handleScroll = () => {
      if (!ticking && isVisible) {
        window.requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect()
          const windowHeight = window.innerHeight
          
          // Calculate scroll progress (0 to 1) as element moves through viewport
          // Parallax effect: element position lags behind actual scroll
          const progress = Math.max(0, Math.min(1, 
            1 - (rect.top / windowHeight)
          ))
          
          setScrollProgress(progress)
          ticking = false
        })
        ticking = true
      }
    }

    // Only add scroll listener after element is visible (performance)
    if (isVisible) {
      window.addEventListener("scroll", handleScroll, { passive: true })
      handleScroll() // Initial calculation
    }

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [isVisible, threshold])

  // Calculate parallax transform (subtle lag effect)
  const parallaxY = isVisible ? Math.max(0, (1 - scrollProgress) * 20) : 50

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? "blur(0px)" : "blur(6px)",
        transform: `translateY(${parallaxY}px)`,
        transition: `
          opacity 0.8s ease-out ${delay}ms,
          filter 0.6s ease-out ${delay}ms,
          transform 0.7s ease-out ${delay}ms
        `,
        willChange: isVisible ? "transform" : "auto", // Optimize rendering
      }}
    >
      {children}
    </div>
  )
}

/**
 * HOW TO REVERT:
 * 
 * If you need to remove scroll reveal effects:
 * 1. In page.tsx, unwrap sections from <ScrollReveal> components
 * 2. Restore original <section> wrappers (see // OLD: comments)
 * 3. Delete this scroll-reveal.tsx file
 * 4. Remove scroll-smooth class from main element if desired
 * 
 * Example revert in page.tsx:
 * <ScrollReveal><section id="hero"><Hero /></section></ScrollReveal>
 * ↓
 * <section id="hero"><Hero /></section>
 */

