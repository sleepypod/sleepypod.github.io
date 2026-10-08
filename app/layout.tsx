import type { Metadata } from 'next'
import { Head } from 'nextra/components'
import 'nextra-theme-docs/style.css'
import './global.css'
export const metadata: Metadata = {
  metadataBase: new URL('https://sleepypod.github.io'),
  title: { default: 'sleepypod — Your bed. Your rules.', template: '%s — sleepypod' },
  description:
    'Local control for your Pod. Meet sleepypod Core, the native iOS app, and the sleepypod Dial.',
  openGraph: { siteName: 'sleepypod', type: 'website' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 205, saturation: 62, lightness: { light: 30, dark: 66 } }} />
      <body>{children}</body>
    </html>
  )
}
