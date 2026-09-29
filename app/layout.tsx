import type { Metadata } from 'next'
import { Head } from 'nextra/components'
import 'nextra-theme-docs/style.css'
import './global.css'
export const metadata: Metadata = {
  metadataBase: new URL('https://sleepypod.github.io'),
  title: { default: 'Sleepypod — Your bed. Your rules.', template: '%s — Sleepypod' },
  description:
    'Local control for your Pod. Meet Sleepypod Core, the native iOS app, and the M5 Rotary Dial.',
  openGraph: { siteName: 'Sleepypod', type: 'website' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 175, saturation: 65 }} />
      <body>{children}</body>
    </html>
  )
}
