'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'

const controls = [
  {
    id: 'dial',
    label: 'Dial',
    lead: 'A familiar turn.',
    description:
      'Sweep around the dial to find your temperature, or use the minus and plus buttons for a small adjustment.',
  },
  {
    id: 'slider',
    label: 'Slider',
    lead: 'Slide into comfort.',
    description:
      'Move up to warm things up or down to cool them off. Your temperature, on a simple vertical scale.',
  },
  {
    id: 'stepper',
    label: 'Now · Night · Dawn',
    lead: 'Think in moments.',
    description:
      'Adjust Now for immediate comfort. Switch to Night or Dawn to shape the saved schedule for later.',
  },
] as const

export function ControlShowcase({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState(0)
  const id = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  function navigate(event: React.KeyboardEvent<HTMLButtonElement>) {
    let next: number
    if (event.key === 'ArrowRight') next = (selected + 1) % controls.length
    else if (event.key === 'ArrowLeft') next = (selected + controls.length - 1) % controls.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = controls.length - 1
    else return
    event.preventDefault()
    setSelected(next)
    buttons.current[next]?.focus()
  }

  return (
    <section
      className={`control-showcase${compact ? ' control-showcase-compact' : ''}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="control-showcase-copy">
        <p className="eyebrow">SAME BED. YOUR WAY.</p>
        <h2 id={`${id}-heading`}>Not one size fits all.</h2>
        <p className="control-showcase-intro">
          A dial, a slider, or a plan for the night. Choose the temperature controls that feel right
          to you.
        </p>
        <div role="tablist" aria-label="Temperature control style" className="control-style-tabs">
          {controls.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={selected === index}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={selected === index ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={navigate}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="control-showcase-setup">
          Make it yours in <strong>Settings → Appearance</strong>. Your choice stays in this
          browser, so your phone and laptop can each feel different.
        </p>
        {!compact && (
          <Link className="text-link" href="/core/temperature/#choose-your-controls">
            Find your controls ↗
          </Link>
        )}
      </div>
      <div className="control-showcase-preview">
        {controls.map((item, index) => (
          <div
            key={item.id}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={selected !== index}
            tabIndex={0}
          >
            <div className="control-showcase-stage">
              <img
                src={`/media/core-control-${item.id}.png`}
                alt={`sleepypod ${item.label} temperature control, left side set to 78°F`}
                width={410}
                height={item.id === 'stepper' ? 447 : 509}
                loading="lazy"
              />
            </div>
            <div className="control-showcase-detail">
              <h3>{item.lead}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
        <p className="control-showcase-note">
          Real app captures · Same example temperature · Choose a style above to preview it.
        </p>
      </div>
    </section>
  )
}
