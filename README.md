# Sleepypod product and documentation site

Nextra + Next.js static export, served at https://sleepypod.github.io/.

## Develop

Use Node 24 and pnpm 10.34.5.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Validate the production output

```sh
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` verifies media, builds `out/`, creates its Pagefind index, checks TypeScript, and runs desktop/mobile browser tests against a static file server. There is no Next.js server in production.

## Content and media

Product guides live in `content/`; the landing page is `app/page.tsx`. Each guide links to its source material. `capture/manifest.json` records media provenance. Run `PRODUCT_ROOT=/path/to/sibling/repos pnpm media:import` to import pinned Git blobs, then `pnpm media:verify`.

Fresh capture instructions are in `content/developers/media.mdx`. Core capture uses `scripts/capture-core.mjs`; see `capture/README.md` for an isolated test instance.

## CI and publishing

Pull requests run **Build and browser checks**. The Pages workflow repeats the production checks and deploys `out/` automatically on pushes to `main`. In GitHub Settings → Pages, the build source must be **GitHub Actions**.

After deployment, verify against production:

```sh
SITE_URL=https://sleepypod.github.io pnpm test
```

Branch protection should require `Build and browser checks`, a pull request, and resolved conversations, with force-pushes and deletions disabled. No human review quota is needed for this small maintainer project.

## Media attribution

Core and iOS source/media originate in their AGPL-3.0 repositories. Dial source/media originate in the MIT-licensed M5 Rotary Dial repository, derived from dallonby/RotaryDial. Full source links and exact revisions are retained in the manifest and page references. Browser framing and capture discipline take inspiration from `noctune-docs`; no noctune product screenshots are reused.

## Dependency patch

`patches/nextra-theme-docs@4.6.1.patch` marks the layout schema's `children` optional because Nextra removes it before validating the remaining theme props. This is the upstream [Nextra #5036](https://github.com/shuding/nextra/issues/5036) defect. pnpm applies the patch on every locked install; remove it once an upstream release fixes the schema.
