import { ImageZoom } from 'nextra/components'
type MediaProps = { src: string; alt: string; caption?: string; priority?: boolean }
export function BrowserFrame({ src, alt, caption }: MediaProps) {
  return (
    <figure className="browser-frame">
      <div className="browser-bar" aria-hidden="true">
        <span>← → ↻</span>
        <span>sleepypod.local:3000</span>
        <span>•••</span>
      </div>
      <ImageZoom src={src} alt={alt} width={1440} height={820} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
export function PhoneFrame({ src, alt, caption, priority = false }: MediaProps) {
  return (
    <figure className="phone-figure">
      <div className="phone-frame">
        <img
          src={src}
          alt={alt}
          width="1206"
          height="2622"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
export function DialFrame({ src, alt, caption }: MediaProps) {
  return (
    <figure className="dial-figure">
      <div className="dial-frame">
        <img src={src} alt={alt} width="240" height="240" loading="lazy" />
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
export function Demo({
  src,
  poster,
  title,
  children,
}: {
  src: string
  poster: string
  title: string
  children: React.ReactNode
}) {
  return (
    <figure className="demo">
      <video controls playsInline preload="metadata" poster={poster} aria-label={title}>
        <source src={src} type="video/mp4" />
      </video>
      <figcaption>
        <strong>{title}</strong> — {children}
      </figcaption>
    </figure>
  )
}
