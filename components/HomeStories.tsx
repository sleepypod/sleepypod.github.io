import Link from 'next/link'
import { BrowserFrame } from './media'

export function HomeStories() {
  return (
    <section className="home-stories" aria-labelledby="stories-heading">
      <div className="section-heading">
        <p className="eyebrow">A LITTLE CURIOSITY. A CLEARER PICTURE.</p>
        <h2 id="stories-heading">See what makes your night work.</h2>
        <p>Follow a reading, understand a rule, and find the story in your sleep data.</p>
      </div>
      <article className="data-story">
        <div>
          <p className="eyebrow">01 / FOLLOW THE DATA</p>
          <h3>From your bed to your browser.</h3>
          <p>
            Your Pod’s sensors feed local processing. The results become the measurements and night
            records you can explore.
          </p>
          <Link className="text-link" href="/core/data-flow/">
            Follow the data flow ↗
          </Link>
        </div>
        <ol className="flow-preview" aria-label="Simplified local biometrics data flow">
          <li>
            <span>01</span>
            <strong>Sense</strong>
            <small>Signals from your Pod</small>
          </li>
          <li>
            <span>02</span>
            <strong>Process</strong>
            <small>Local sensor modules</small>
          </li>
          <li>
            <span>03</span>
            <strong>Explore</strong>
            <small>Your nights and trends</small>
          </li>
        </ol>
      </article>
      <article className="feature-story">
        <div className="story-copy">
          <p className="eyebrow">02 / AUTOPILOT</p>
          <h3>A rule you can read.</h3>
          <p>
            When something happens, if your conditions match, then take an action. Start with a
            template and inspect what it would do.
          </p>
          <div className="rule-preview" aria-label="Example water-low rule">
            <span>
              <b>WHEN</b> Water level changes
            </span>
            <span>
              <b>IF</b> The reading says low
            </span>
            <span>
              <b>THEN</b> Record a notification
            </span>
          </div>
          <p className="story-note">
            This example records a service-log notification. It does not send a phone push.
          </p>
          <Link className="text-link" href="/core/autopilot/">
            Explore Autopilot ↗
          </Link>
        </div>
        <BrowserFrame
          src="/media/core-autopilot.png"
          alt="Real core Autopilot interface showing templates and automation activity"
          caption="Real app capture with synthetic example data."
        />
      </article>
      <article className="feature-story biometrics-story">
        <div className="story-copy">
          <p className="eyebrow">03 / BIOMETRICS</p>
          <h3>Your night, with context.</h3>
          <p>
            Explore sleep records, movement, and available heart-rate and breathing measurements.
            See what was captured—and where a reading is missing.
          </p>
          <ul className="metric-list">
            <li>Heart rate &amp; HRV</li>
            <li>Breathing</li>
            <li>Presence &amp; movement</li>
          </ul>
          <p className="story-note">
            Availability depends on your sensors and active modules. A night record can exist
            without a full set of vitals.
          </p>
          <Link className="text-link" href="/core/biometrics/">
            Understand your sleep data ↗
          </Link>
        </div>
        <BrowserFrame
          src="/media/core-sleep.png"
          alt="Real core Nights view showing an example sleep record"
          caption="Synthetic night record; insufficient vitals for sleep-stage classification."
        />
      </article>
    </section>
  )
}
