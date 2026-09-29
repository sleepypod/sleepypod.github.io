import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      navbar={
        <Navbar
          logo={
            <span className="wordmark">
              <span className="brand-dot" />
              sleepypod<span className="docs-label"> / docs</span>
            </span>
          }
          projectLink="https://github.com/sleepypod"
        />
      }
      footer={
        <Footer>
          <span>
            Sleepypod · Open source. Local by design. <a href="/">Back to home ↗</a>
          </span>
        </Footer>
      }
      pageMap={await getPageMap()}
      docsRepositoryBase="https://github.com/sleepypod/sleepypod.github.io/tree/main"
      feedback={{
        content: 'Found an issue?',
        link: 'https://github.com/sleepypod/sleepypod.github.io/issues',
      }}
      nextThemes={{ defaultTheme: 'dark' }}
    >
      {children}
    </Layout>
  )
}
