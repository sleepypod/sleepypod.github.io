# Product media workflow

The interface pixels come from real applications. Browser, iPhone, and Dial framing is implemented in CSS, inspired by `noctune-docs/components/browser-frame.tsx`. No screenshot pixels are redrawn.

## Imported media

`manifest.json` pins upstream Git blobs. The importer resolves Git LFS objects and verifies their object hashes before writing them. Uncommitted product changes are excluded.

```sh
PRODUCT_ROOT=/path/to/sleepypod pnpm media:import
pnpm media:verify
```

Expected sibling checkout names: `sleepypod-ios`, `sleepypod-mt-rotary-dial`, and `sleepypod-core`. Override `PRODUCT_ROOT` explicitly outside the default site worktree layout.

## Core: isolated capture instance

Use a dedicated worktree at the Core revision pinned in `manifest.json`. Read Core's `AGENTS.md`, check existing worktrees, and ensure `/.codex/worktrees/` is locally ignored before creating one. Do not use an existing development database or copy `.env` from a real Pod.

Inside the clean Core worktree:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm rebuild better-sqlite3
mkdir -p .capture
CI=1 DATABASE_URL=file:./.capture/sleepypod.db \
  BIOMETRICS_DATABASE_URL=file:./.capture/biometrics.db \
  DAC_SOCK_PATH=/tmp/sleepypod-docs-no-device.sock \
  pnpm exec next dev --hostname 127.0.0.1 --port 3210
```

Core migrates/seeds these new disposable databases. `CI=1` skips hardware/scheduler initialization. The capture intercepts `device.getStatus` with `core-status.json`, supplies schedules from `core-demo.mjs` and richer API responses from `core-rich-data.mjs` / `core-rich-demo.json`, replaces the sensor WebSocket with synthetic frames and blocks non-GET tRPC calls, and makes remaining queries only to this loopback instance. Hardware health and scheduler queries also use fixtures to avoid hardware probes. The demo shows a healthy Pod, a week of synthetic vitals and sleep records, active and dry-run rules, and a resolved example service incident. The Health map uses core’s own status evaluator; sleep stages use its real classifier; the Autopilot backtest capture opens the saved “Cool when restless” rule, and its chart comes from core’s own `runBacktest` replayed over the synthetic nights at fixture-generation time. There is no real hardware or personal history. It preserves real UI rendering, with the Next.js development badge hidden. The tRPC fixture transport uses SuperJSON/JSONL so the normal streaming client and Date values still work.

In the site worktree:

```sh
CORE_CAPTURE_URL=http://127.0.0.1:3210 CORE_SOURCE_COMMIT=<full-core-commit> node scripts/capture-core.mjs
```

Still captures use a 1440×1000 CSS viewport at 2× device scale (2880×2000 PNGs). The three control cards use element captures at the same scale. The native Health SVG animation is sampled through its own animation clock at 25 frames per second for 7.2 seconds, which is exactly three of its 2.4-second dot cycles so the loop has no visible cut. Each frame is a real 2× element screenshot, encoded as silent H.264 with fast-start metadata. Promotion pads the poster and every frame by 96 device pixels with the map's own corner colour so player controls never cover the bottom row of nodes. No UI pixels are redrawn. The Health map clip is silent and loops automatically with controls visible; it has a still poster.

To regenerate the deterministic fixture JSON, run from the pinned Core checkout (Core's `tsx` resolves its pure source modules):

```sh
pnpm exec tsx /path/to/site/scripts/generate-core-demo.cts /path/to/site/capture/core-rich-demo.json
```

Inspect every `.capture/core-*.png`, including Health and Biometrics, then promote the reviewed stills and encode the video:

```sh
node scripts/promote-core-capture.mjs
pnpm media:verify
```

Promotion updates source commits, methods, dimensions, byte sizes, and SHA-256 checksums for just these captures. The capture records any recoverable Next.js development metadata hydration warnings separately in `.capture/browser-warnings.json` and rejects other browser exceptions. Stop the isolated Core server when finished.

The published Core image shows synthetic temperatures, schedules, and sleep on a fixed example date (September 30, 2026, America/Los_Angeles). These are transport fixtures, not measurements from a real bed. The application renders all controls and charts without UI modifications. The original bed-and-moon logo and icon are imported byte-for-byte from Core; `app/icon.png` mirrors the imported icon.

## Hardware access photos

`content/core/root-access.mdx` uses original Pod 5 photos from core and wiring photos from free-sleep. The manifest pins each Git blob; JPEG and PNG dimensions and checksums are verified. Importing these requires the `free-sleep` sibling checkout as well. The original free-sleep license is retained in `licenses/free-sleep.md`. Images are copied unchanged, including existing annotations.

## iOS and Dial

The published iOS screenshots are imported byte-for-byte from the pinned iOS repository. Fresh iOS capture requires Xcode Simulator and a mock backend; see `content/developers/media.mdx` for `simctl` commands. Inspect status bars and data before promotion.

Dial media is imported byte-for-byte from its `docs/screens` and `docs/video` directories. To recapture, use that repository's `tools/walkthrough.py` and a serial-connected test Dial. Clips are silent; the visible text below each clip describes the demonstrated action. All clips have controls, posters, and no autoplay.

## Release review

- Inspect every still, play every video, and check for private data.
- Run `pnpm check`.
- Open the static site at desktop and phone widths, including light and dark docs.
- Check manifest changes alongside the product source revision.
- Source licenses are preserved in `licenses/`.
