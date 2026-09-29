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

Core migrates/seeds these new disposable databases. `CI=1` skips hardware/scheduler initialization. The capture intercepts `device.getStatus` with `core-status.json`, blocks the sensor WebSocket and non-GET tRPC calls, and makes remaining queries only to this loopback instance. There is no real hardware or personal history. It preserves real UI rendering, with the Next.js development badge hidden. The tRPC fixture transport uses SuperJSON/JSONL so the normal streaming client and Date values still work.

In the site worktree:

```sh
CORE_CAPTURE_URL=http://127.0.0.1:3210 node scripts/capture-core.mjs
```

Inspect `.capture/core-temperature.png`. Then copy the unchanged PNG to `public/media/core-temperature.png`, update that entry's SHA-256, byte size, width, height, and source commit in `manifest.json`, and copy `.capture/core-capture.json` to `capture/core-capture.json`. `pnpm media:verify` checks the promoted asset. Stop the isolated server after capture; preserve the worktree if it will be reused.

The published Core image intentionally shows a new installation with no recorded night or schedule. The two temperature states are synthetic transport fixtures, not measurements from a real bed.

## iOS and Dial

The published iOS screenshots are imported byte-for-byte from the pinned iOS repository. Fresh iOS capture requires Xcode Simulator and a mock backend; see `content/developers/media.mdx` for `simctl` commands. Inspect status bars and data before promotion.

Dial media is imported byte-for-byte from its `docs/screens` and `docs/video` directories. To recapture, use that repository's `tools/walkthrough.py` and a serial-connected test Dial. Clips are silent; the visible text below each clip describes the demonstrated action. All clips have controls, posters, and no autoplay.

## Release review

- Inspect every still, play every video, and check for private data.
- Run `pnpm check`.
- Open the static site at desktop and phone widths, including light and dark docs.
- Check manifest changes alongside the product source revision.
- Source licenses are preserved in `licenses/`.
