import type { NextConfig } from 'next'
import { config } from 'dotenv'
import { resolve } from 'node:path'

// Unica fonte di verità per le env: .env.local nella ROOT del monorepo.
// Next legge nativamente solo i .env della cartella dell'app; qui carichiamo
// quello di root con override, così un'eventuale copia locale stantia non
// vince mai (vedi KNOWN_ISSUES RIS-003). In CI/Vercel il file non esiste e
// questa chiamata è un no-op: valgono le env del processo.
config({ path: resolve(__dirname, '../../.env.local'), override: true })

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wormhole/database', '@wormhole/shared', '@wormhole/ui', '@wormhole/core'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  typedRoutes: true,
}

export default nextConfig
