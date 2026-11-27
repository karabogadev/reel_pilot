<p align="center">
  <img src="icons/icon-128.png" width="88" height="88" alt="Reel Pilot icon" />
</p>

<h1 align="center">Reel Pilot</h1>

<p align="center">
  Auto-advance, a seek bar, 0.25x–4x speed and viewing tools for Instagram Reels on the web.<br />
  <a href="https://karabogadev.github.io/reel_pilot/">Website</a> ·
  <a href="https://github.com/karabogadev/reel_pilot/releases/latest/download/reel-pilot.zip">Download</a> ·
  <b>English</b> | <a href="README.tr.md">Türkçe</a>
</p>

---

Reel Pilot is a small Manifest V3 extension for Brave, Chrome and other Chromium browsers. It adds the controls
Instagram Reels is missing on desktop:

- **Auto-advance.** When a reel ends, it scrolls to the next one. Each reel can play 1–5 times before it moves on.
- **Seeking.** A draggable progress bar on the bottom edge of every reel, with the time on hover, plus keyboard
  seeking.
- **Speed.** 0.25x–4x, remembered and applied to every reel that follows. Hold `F` for double speed.
- **Viewing tools.** Step frame by frame, copy the current frame as an image, loop a part of a reel (A-B loop), or
  stay on one reel instead of moving on.
- **Break reminder.** Pauses after a number of reels or minutes you choose, until you press continue.

> The extension's own interface (popup, in-page buttons) is in Turkish for now.

## Install

1. Download [`reel-pilot.zip`](https://github.com/karabogadev/reel_pilot/releases/latest/download/reel-pilot.zip)
   and unzip it somewhere you'll keep it.
2. Open `brave://extensions` or `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked**, pick the unzipped folder, then open
   [instagram.com/reels](https://www.instagram.com/reels/).

To update, replace the folder with the new release and press the reload button on the extension card.

## Shortcuts

| Key | Action |
| --- | --- |
| `←` / `→` | Seek back / forward (Reels feed only) |
| `S` / `D` | Slower / faster |
| `R` | Reset speed to 1x |
| `F` (hold) | Double speed while held |
| `,` / `.` | Previous / next frame (pauses the reel) |
| `C` | Copy the current frame (downloads it if the clipboard is blocked) |
| `[` / `]` / `\` | A-B loop: set start / set end / clear |
| `A` | Toggle auto-advance (Reels feed only) |
| `K` | Stay on this reel (Reels feed only) |

Shortcuts are off while you type and can be turned off in the popup. The seek step (2–15 s) and the break reminder
are set there too.

## Privacy

- Runs only on `instagram.com`, and stays off on Stories.
- The only permission is `storage`, used to keep your settings in the browser.
- No network requests, no analytics, no account.
- **Copy diagnostics** in the popup copies a report to your clipboard for bug reports. It contains no URLs, reel codes
  or account names, and is never sent anywhere.

## How it works

The extension never relies on Instagram's class names or selectors. It uses capture-phase media events, one
`requestAnimationFrame` loop that tracks the video closest to the viewport centre, and a fixed Shadow DOM overlay
appended to `<html>`. Settings live in `chrome.storage.local`; the popup and the in-page controls only write there.

| Path | What it is |
| --- | --- |
| `src/core/` | Pure logic (settings, keys, playback, route), covered by the tests |
| `src/content/runtime.ts` | Active video, speed, auto-advance and the frame loop |
| `src/content/overlay.ts` | In-page UI |
| `src/content/features/` | Viewing tools and the break reminder, built on the runtime |
| `src/pages/popup/` | Settings |
| `docs/` | The [website](https://karabogadev.github.io/reel_pilot/) (GitHub Pages) |

## Development

TypeScript, bundled with esbuild into `dist/`. The tests run the TypeScript directly, so they need Node 22.18 or newer.

```sh
npm install
npm run build   # bundle into dist/ (npm run dev rebuilds on change)
npm run check   # typecheck, lint and tests
```

Load `dist/` with **Load unpacked**. After a rebuild, press the reload button on the extension card and refresh the
Instagram tab.

To cut a release, bump `version` in `package.json` (the build copies it into the manifest), then zip the contents of
`dist/` under a fixed name, so the download link above always points to the latest one:

```sh
npm run check && npm run build
(cd dist && zip -r ../reel-pilot.zip .)
gh release create v0.2.0 reel-pilot.zip
```

---

Reel Pilot is an independent project and is not affiliated with Instagram or Meta.
