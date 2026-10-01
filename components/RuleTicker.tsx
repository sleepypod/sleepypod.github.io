'use client'

import { useEffect, useState } from 'react'

const rules = [
  {
    when: 'Water level changes',
    if: 'The reading says low',
    then: 'Record a notification',
    note: 'This example records a service-log notification. It does not send a phone push.',
  },
  {
    when: 'The clock ticks past 11 PM',
    if: 'It is still before 6 AM',
    then: 'Hold the bed 3°F above the room',
    note: 'A continuous policy. Leaving the window withdraws the request and another source takes over.',
  },
  {
    when: 'Movement is sampled',
    if: 'The 10-minute average is over 200',
    then: 'Cool 2°F below baseline for 20 minutes',
    note: 'A one-shot with a 30-minute cooldown. The target is calculated once, not stacked on each check.',
  },
] as const

const parts = ['when', 'if', 'then'] as const
const interval = 3600

export function RuleTicker() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches || paused) return
    const tick = () => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % rules.length)
    }
    const timer = setInterval(tick, interval)
    return () => clearInterval(timer)
  }, [paused])

  const rule = rules[index]
  return (
    <div
      className="rule-preview rule-ticker"
      aria-label="Example Autopilot rules"
      data-rule={index}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {parts.map((part) => (
        <span key={part}>
          <b>{part.toUpperCase()}</b>
          <span className="rule-slot">
            <span key={index} className="rule-value">
              {rule[part]}
            </span>
          </span>
        </span>
      ))}
      <p className="story-note rule-note" key={`note-${index}`}>
        {rule.note}
      </p>
      <div className="rule-dots" role="group" aria-label="Choose an example rule">
        {rules.map((item, i) => (
          <button
            key={item.when}
            type="button"
            className="rule-dot"
            aria-label={`Example ${i + 1} of ${rules.length}: ${item.then}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
