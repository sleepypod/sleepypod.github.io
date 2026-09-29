import Link from 'next/link'
import { PhoneFrame, DialFrame, BrowserFrame } from '../components/media'
export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="home-nav">
        <Link className="wordmark" href="/">
          <img
            className="brand-logo"
            src="/media/sleepypod-logo.png"
            alt=""
            width="48"
            height="48"
          />
          sleepypod
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/getting-started/">Documentation</Link>
          <a href="https://github.com/sleepypod">GitHub ↗</a>
        </nav>
      </header>
      <main id="main" data-pagefind-body>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> LOCAL CONTROL. BETTER NIGHTS.
            </p>
            <h1>
              Your bed.
              <br />
              <em>Your rules.</em>
            </h1>
            <p className="hero-description">
              Make your Pod feel like yours. Set the temperature, shape your night, and keep your
              sleep data at home.
            </p>
            <div className="actions">
              <Link className="button primary" href="/getting-started/">
                Get started <span>↗</span>
              </Link>
              <a className="button secondary" href="#ecosystem">
                Meet the ecosystem ↓
              </a>
            </div>
            <p className="hero-note">Open source · Pod 3, 4 & 5 · Built for your local network</p>
          </div>
          <div className="hero-media">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-phone">
              <PhoneFrame
                priority
                src="/media/ios-temperature.png"
                alt="Sleepypod iOS temperature screen set to 75 degrees Fahrenheit"
              />
            </div>
            <div className="hero-dial">
              <DialFrame
                src="/media/dial-heating.png"
                alt="Real M5 Dial display showing a 75 degree target"
              />
              <span className="media-tag">A little less screen time.</span>
            </div>
          </div>
        </section>
        <section className="web-showcase" aria-labelledby="web-heading">
          <div className="section-heading">
            <p className="eyebrow">IN YOUR BROWSER. ON YOUR NETWORK.</p>
            <h2 id="web-heading">Your whole night, in view.</h2>
            <p>
              Set each side’s temperature, see last night alongside tonight’s schedule, and keep an
              eye on your Pod—all in the Core web app.
            </p>
            <Link className="text-link" href="/core/">
              Explore the web app ↗
            </Link>
          </div>
          <BrowserFrame
            src="/media/core-temperature.png"
            alt="Sleepypod Core web app with side-by-side temperature controls and the overnight timeline"
            caption="The real Core web app, shown with example temperatures, schedules, and sleep data."
          />
        </section>
        <div className="principles">
          <div>
            <span>01 / LOCAL</span>
            <p>Your Pod runs the show.</p>
          </div>
          <div>
            <span>02 / PERSONAL</span>
            <p>Two sides. Your settings.</p>
          </div>
          <div>
            <span>03 / OPEN</span>
            <p>Built to make your own.</p>
          </div>
        </div>
        <section id="ecosystem" className="ecosystem">
          <div className="section-heading">
            <p className="eyebrow">THREE WAYS TO FEEL AT HOME</p>
            <h2>One bed. A connected ecosystem.</h2>
            <p>Core does the work. Choose how you take control.</p>
          </div>
          <div className="product-grid">
            <Link className="product-card core-card" href="/core/">
              <span className="card-number">01 — THE FOUNDATION</span>
              <div className="product-symbol">⌁</div>
              <h3>
                Sleepypod Core <span>↗</span>
              </h3>
              <p>
                The local server on your Pod. A web app, schedules, biometrics, and integrations in
                one place.
              </p>
              <span className="card-link">Explore Core</span>
            </Link>
            <Link className="product-card ios-card" href="/ios/">
              <span className="card-number">02 — IN YOUR HAND</span>
              <div className="product-symbol">◫</div>
              <h3>
                Sleepypod iOS <span>↗</span>
              </h3>
              <p>
                A native companion for temperature, sleep trends, and the details of your night.
              </p>
              <span className="card-link">Explore the iOS app</span>
            </Link>
            <Link className="product-card dial-card" href="/dial/">
              <span className="card-number">03 — AT YOUR BEDSIDE</span>
              <div className="product-symbol">◉</div>
              <h3>
                M5 Rotary Dial <span>↗</span>
              </h3>
              <p>
                Turn for comfort. Click for off. A tactile controller designed to disappear into the
                night.
              </p>
              <span className="card-link">Explore the Dial</span>
            </Link>
          </div>
        </section>
        <section className="night-section">
          <div>
            <p className="eyebrow">A ROUTINE THAT FEELS RIGHT</p>
            <h2>
              Settle in.
              <br />
              Let your bed follow.
            </h2>
          </div>
          <div className="night-steps">
            <article>
              <span>01</span>
              <div>
                <h3>Find your temperature</h3>
                <p>Adjust either side from the web, your phone, or the bedside Dial.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Shape the night</h3>
                <p>Schedule temperature changes, power, and a vibration alarm.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Wake up with context</h3>
                <p>Explore sleep sessions and sensor trends, processed on your own devices.</p>
              </div>
            </article>
          </div>
        </section>
        <section className="start-section">
          <p className="eyebrow">YOUR NEXT GOOD NIGHT STARTS HERE</p>
          <h2>A home for your hardware.</h2>
          <p>Start with Core, then add the controls that fit your routine.</p>
          <Link className="button primary" href="/getting-started/">
            Find your setup ↗
          </Link>
          <div className="quick-links">
            <Link href="/troubleshooting/">Troubleshooting</Link>
            <Link href="/developers/">Developer reference</Link>
            <Link href="/about/">About the project</Link>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <Link className="wordmark" href="/">
          <img
            className="brand-logo"
            src="/media/sleepypod-logo.png"
            alt=""
            width="48"
            height="48"
          />
          sleepypod
        </Link>
        <p>
          Independent, community-built software for your Pod.
          <br />
          Not affiliated with Eight Sleep or M5Stack.
        </p>
        <a href="https://github.com/sleepypod">Made in the open ↗</a>
      </footer>
    </div>
  )
}
