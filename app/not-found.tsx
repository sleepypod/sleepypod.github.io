import Link from 'next/link'
import { LinkArrow } from '../components/LinkArrow'
export default function NotFound() {
  return (
    <main className="home start-section" style={{ minHeight: '100vh' }}>
      <p className="eyebrow">404 / A LITTLE OFF TRACK</p>
      <h1 style={{ fontSize: 48, margin: '30px 0' }}>This page has drifted off.</h1>
      <p>Find your way back to the product guides.</p>
      <Link className="button primary" href="/getting-started/">
        Open the docs <LinkArrow />
      </Link>
      <div className="quick-links">
        <Link href="/">Back to home</Link>
      </div>
    </main>
  )
}
