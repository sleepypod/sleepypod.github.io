'use client'

import { useEffect, useRef, useState } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string
        alt: string
        poster?: string
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'touch-action'?: string
        'shadow-intensity'?: string
        'camera-orbit'?: string
        'interaction-prompt'?: string
        exposure?: string
      }
    }
  }
}

type Props = { src: string; alt: string; caption?: React.ReactNode }

export function EnclosureViewer({ src, alt, caption }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAutoRotate(!motion.matches)
    const onChange = () => setAutoRotate(!motion.matches)
    motion.addEventListener('change', onChange)
    let cancelled = false
    import('@google/model-viewer').then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
      motion.removeEventListener('change', onChange)
    }
  }, [])
  return (
    <figure className="enclosure-viewer">
      {ready ? (
        <model-viewer
          ref={ref}
          src={src}
          alt={alt}
          camera-controls
          auto-rotate={autoRotate || undefined}
          touch-action="pan-y"
          shadow-intensity="1"
          camera-orbit="-30deg 75deg auto"
          interaction-prompt="none"
        />
      ) : (
        <div className="enclosure-viewer-placeholder" role="img" aria-label={alt} />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
