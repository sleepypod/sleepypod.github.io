import { HomeStories } from '../components/HomeStories'
import { BrandLogo } from '../components/BrandLogo'
import { DiscordIcon, GitHubIcon } from 'nextra/icons'
import Link from 'next/link'
import { ControlShowcase } from '../components/ControlShowcase'
import { LinkArrow } from '../components/LinkArrow'
import { PhoneFrame, DialFrame, BrowserFrame } from '../components/media'
export default function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="home-nav">
        <Link className="wordmark" href="/">
          <BrandLogo />
          sleepypod
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/getting-started/">Documentation</Link>
          <a href="https://sleepypod-demo.vercel.app">Live demo</a>
          <a className="github-link" href="https://github.com/sleepypod" aria-label="GitHub">
            <GitHubIcon aria-hidden="true" focusable="false" />
            <span className="link-label">GitHub</span>
          </a>
          <a className="github-link" href="https://discord.gg/UMmv5R6MXa" aria-label="Discord">
            <DiscordIcon aria-hidden="true" focusable="false" />
            <span className="link-label">Discord</span>
          </a>
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
              Make your Pod feel like yours. Control it from your browser, your phone, an AI agent
              over MCP, or your home automation through MQTT and Apple HomeKit. Core is modular, so
              a new client or integration slots in without touching the rest. Your sleep data stays
              at home.
            </p>
            <div className="actions">
              <Link className="button primary" href="/getting-started/">
                Get started <LinkArrow />
              </Link>
              <a className="button secondary" href="#ecosystem">
                Meet the ecosystem <LinkArrow direction="down" />
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
                alt="sleepypod iOS temperature screen set to 75 degrees Fahrenheit"
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
            <div className="showcase-links">
              <a className="text-link" href="https://sleepypod-demo.vercel.app">
                Try the live demo <LinkArrow direction="external" />
              </a>
              <Link className="text-link" href="/core/">
                Explore the web app <LinkArrow />
              </Link>
            </div>
          </div>
          <BrowserFrame
            src="/media/core-temperature.png"
            alt="sleepypod Core web app with side-by-side temperature controls and the overnight timeline"
            caption="The real Core web app, shown with example temperatures, schedules, and sleep data."
          />
        </section>
        <ControlShowcase />
        <HomeStories />
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
            <p>Core does the work. Choose a client—or build your own.</p>
          </div>
          <div className="product-grid">
            <Link className="product-card core-card" href="/core/">
              <span className="card-number">01 — THE FOUNDATION</span>
              <div className="product-capture core-capture">
                <img
                  src="/media/core-temperature.png"
                  alt="Core web app temperature controls"
                  width="1440"
                  height="1000"
                  loading="lazy"
                />
              </div>
              <h3>
                sleepypod Core <LinkArrow />
              </h3>
              <p>
                The local server on your Pod. Client-agnostic APIs, a web app, schedules,
                biometrics, and home automation.
              </p>
              <span className="card-link">Explore Core</span>
            </Link>
            <Link className="product-card ios-card" href="/ios/">
              <span className="card-number">02 — IN YOUR HAND</span>
              <div className="product-capture ios-capture">
                <img
                  src="/media/ios-temperature.png"
                  alt="Native iOS temperature screen"
                  width="1206"
                  height="2622"
                  loading="lazy"
                />
              </div>
              <h3>
                sleepypod iOS <LinkArrow />
              </h3>
              <p>
                A native companion for temperature, sleep trends, and the details of your night.
              </p>
              <span className="card-link">Explore the iOS app</span>
            </Link>
            <Link className="product-card dial-card" href="/dial/">
              <span className="card-number">03 — AT YOUR BEDSIDE</span>
              <div className="product-capture dial-capture">
                <img
                  src="/media/dial-heating.png"
                  alt="Real M5 Dial display while heating"
                  width="240"
                  height="240"
                  loading="lazy"
                />
              </div>
              <h3>
                M5 Rotary Dial <LinkArrow />
              </h3>
              <p>
                An ESP32-based M5Stack Dial. Turn for comfort, click for off, and keep a tactile
                controller at your bedside.
              </p>
              <span className="card-link">Explore the Dial</span>
            </Link>
          </div>
          <div className="build-invitation">
            <div>
              <p className="eyebrow">AN OPEN INVITATION</p>
              <h3>Your interface belongs here, too.</h3>
              <p>
                Core is client-agnostic: use our apps, connect your home automation, or build your
                own controller on the local API. A different screen, a physical button, your own ESP
                project—make it yours.
              </p>
            </div>
            <div className="integration-links">
              <Link href="/developers/api/">
                Build with the API <LinkArrow />
              </Link>
              <Link href="/core/integrations/#home-assistant--mqtt">
                Home Assistant &amp; MQTT <LinkArrow />
              </Link>
              <Link href="/core/integrations/#apple-home--homekit">
                Apple Home &amp; HomeKit <LinkArrow />
              </Link>
              <Link href="/core/mcp/">
                MCP for agents <LinkArrow />
              </Link>
              <Link href="/developers/dial/">
                Explore the ESP32 Dial <LinkArrow />
              </Link>
            </div>
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
            Find your setup <LinkArrow />
          </Link>
          <div className="quick-links">
            <a href="https://sleepypod-demo.vercel.app">Live demo</a>
            <Link href="/troubleshooting/">Troubleshooting</Link>
            <Link href="/developers/">Developer reference</Link>
            <Link href="/about/">About the project</Link>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <Link className="wordmark" href="/">
          <BrandLogo />
          sleepypod
        </Link>
        <p>
          Independent, community-built software for your Pod.
          <br />
          Not affiliated with Eight Sleep or M5Stack.
        </p>
        <nav className="footer-links" aria-label="Community">
          <a href="https://github.com/sleepypod">
            Made in the open <LinkArrow direction="external" />
          </a>
          <a href="https://discord.gg/UMmv5R6MXa">
            Join the Discord <LinkArrow direction="external" />
          </a>
        </nav>
      </footer>
    </div>
  )
}
