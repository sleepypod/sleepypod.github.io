import { ExternalLinkIcon } from './ExternalLinkIcon'
import Link from 'next/link'
import { BrowserFrame, Demo } from './media'
import { RuleTicker } from './RuleTicker'

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
            Follow the data flow <ExternalLinkIcon />
          </Link>
        </div>
        <Demo
          wide
          autoplay
          src="/media/core-health-flow.mp4"
          poster="/media/core-health-map.png"
          title="Watch the data flow"
        >
          The real System → Health map, recorded with synthetic sensor and service data. Moving dots
          trace the connections from sensors to outputs. Silent video; it plays and loops on its
          own.
        </Demo>
      </article>
      <article className="feature-story">
        <div className="story-copy">
          <p className="eyebrow">02 / AUTOPILOT</p>
          <h3>A rule you can read.</h3>
          <p>
            When something happens, if your conditions match, then take an action. Start with a
            template and inspect what it would do.
          </p>
          <RuleTicker />
          <p className="story-note">
            Replay any rule against a recorded night before it touches your bed.{' '}
            <Link href="/core/autopilot/#backtest-before-you-trust-it">See how backtests work</Link>
          </p>
          <Link className="text-link" href="/core/autopilot/">
            Explore Autopilot <ExternalLinkIcon />
          </Link>
        </div>
        <BrowserFrame
          src="/media/core-autopilot-backtest.png"
          alt="Real core rule editor replaying the Cool when restless rule over a recorded night, with fire markers and the resulting setpoint"
          caption="Real app capture: a rule backtested over a synthetic night with Core's own replay engine."
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
            Understand your sleep data <ExternalLinkIcon />
          </Link>
        </div>
        <BrowserFrame
          src="/media/core-sleep.png"
          alt="Real core Nights view showing an example sleep record"
          caption="Real app capture with synthetic sleep stages, heart rate, and night records."
        />
      </article>
    </section>
  )
}
