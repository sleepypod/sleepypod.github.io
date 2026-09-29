# Site instructions

- Use the product repositories as the source of truth. Pin source references when documenting behavior.
- Preserve real product screenshots. Do not draw or fabricate product UI.
- Media source revisions, dimensions, methods, and SHA-256 checksums live in `capture/manifest.json`.
- Capture only disposable test data. Use loopback for Core and a simulator/mock backend for iOS.
- Use components for browser/device framing; keep raw screenshots intact.
- Run `pnpm check` before publishing. It verifies media, static export, types, routes, links/fragments, search, responsive overflow, and video decoding.
- Pages deploys from `main`; pull requests must pass `Build and browser checks`.
- Preserve unrelated worktrees. New worktrees belong in `.codex/worktrees/`, ignored through Git's local `info/exclude`.
- Write `sleepypod` in lowercase everywhere in authored copy, including headings, metadata, and alt text. Keep exact code identifiers and Xcode names (`SleepypodProtocol`, `Sleepypod.xcodeproj`, the `Sleepypod` scheme) unchanged until the iOS source renames them.
