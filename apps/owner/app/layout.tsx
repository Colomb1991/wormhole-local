import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wormhole — Pannello Titolare',
  description: 'Gestione ordini ristorante',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#00A893',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
