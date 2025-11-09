import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Explicitly set root to this directory to avoid monorepo detection
    root: __dirname,
  },
  // Bundle markdown docs located in the monorepo root so the API route can
  // serve them when deployed to Vercel/Netlify (serverless envs).
  outputFileTracingIncludes: {
    '/api/docs/[slug]': ['./docs/**/*'],
  },
}

export default nextConfig
