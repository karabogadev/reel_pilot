# Reel Pilot

A small Manifest V3 extension (Brave / Chromium) that adds the controls Instagram Reels on the web is missing:

- **Auto-advance** — scrolls to the next reel when the current one ends (after 1–5 plays).
- **Seeking** — a draggable progress bar on the bottom edge of the video, plus keyboard seeking.
- **Speed** — 0.25x–4x, remembered and applied to every reel.

## Install

1. Open `brave://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Open `https://www.instagram.com/reels/`.

After changing the code, press the reload button on the extension card and refresh the Instagram tab.

## Shortcuts

| Key | Action |
| --- | --- |
| `←` / `→` | Seek back / forward (Reels feed only) |
| `S` / `D` | Slower / faster |
| `R` | Reset speed to 1x |
| `A` | Toggle auto-advance (Reels feed only) |

Shortcuts are off while typing and can be disabled in the popup.

## How it works

The extension never relies on Instagram's class names or selectors. It uses capture-phase media events, one
`requestAnimationFrame` loop that tracks the video closest to the viewport centre, and a fixed Shadow DOM overlay
appended to `<html>`. Settings live in `chrome.storage.local`; the popup and the in-page controls only write there.

- `src/core.js` — pure logic, shared by the content script, the popup and the tests
- `src/overlay.js` — in-page UI
- `src/content.js` — wiring
- `popup/` — settings

## Development

```sh
node --test                  # unit tests for src/core.js
node scripts/make-icons.mjs  # regenerate icons
```
