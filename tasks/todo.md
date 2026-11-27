# Reel Pilot — yapılacaklar

- [x] Proje iskeleti + `git init -b main`
- [x] Canlı DOM keşfi (headless, giriş yapılmamış oturum; Aside kurulu değil)
- [x] `src/core.js` + `tests/core.test.js`
- [x] `src/content.js`: aktif video, hız, oto-geçiş, klavye
- [x] `src/overlay.js`: ilerleme çubuğu, kontrol hapı, toast
- [x] Popup + ikonlar + `manifest.json`
- [x] Doğrulama: `node --test`, canlı sayfada enjeksiyon
- [ ] Brave'de Load unpacked ile gerçek kurulum, giriş yapılmış oturumda kontrol (kullanıcı)
- [x] `main`'de ilk commit + private repo

## Review

Canlı DOM keşfi planı iki yerde değiştirdi:

- Instagram videoları `loop` kullanmıyor; `ended` gelince JS ile baştan oynatıyor. Oto-geçiş açıkken `ended`
  event'i capture fazında durduruluyor ve karar (tekrar / geç) eklentide veriliyor. `loop = true` gelen varyant
  için `loop` zorlaması yine de duruyor.
- Oynatıcı arabelleğe alırken `playbackRate`'i 0 yapıyor; hız zorlaması 0'a dokunmuyor.
- Sentetik `ArrowDown` yedeği çıkarıldı: canlı sayfada etkisi görülmedi. Zincir: `scrollBy` → `scrollIntoView` → tekrar oynat.
- Plan dışı ek: reel'in üstünü modal kapatınca (giriş duvarı, paylaş penceresi) arayüz gizleniyor ve kısayollar duruyor.

Canlı sayfada doğrulananlar (headless Chromium, giriş yapılmamış, script enjeksiyonu ile):
hız tüm reel'lere uygulanıyor ve geçişte korunuyor; ←/→ ±5 sn; S/D/R/A; çubuğa gerçek tıklama %50'ye sarıyor ve
videoyu duraklatmıyor; bitişte sonraki reel'e geçiş (1 ve 2 oynatma); oto-geçiş kapalıyken IG'nin döngüsü;
`scrollBy` çalışmazsa `scrollIntoView`, o da çalışmazsa tekrar oynatma; arabellek duraklamasından sonra hız korunuyor.

Doğrulanmayanlar: gerçek eklenti olarak yükleme (manifest, izinler, isolated world, popup'ın gerçek depoyla
çalışması) ve giriş yapılmış oturumdaki DOM (video havuzu, `loop = true` varyantı).

---

# GitHub Pages marketing page + TR/EN README

Decisions (user): make the repo public · `README.md` (EN) + `README.tr.md` · single page with a TR/EN toggle · v0.1.0 Release + zip.

- [x] `docs/index.html` + `docs/style.css` + `docs/app.js` (i18n, no dependencies) + `docs/icon.png` + `.nojekyll`
  - Hero: headline, "Download" → `releases/latest`, GitHub link; animated HTML/CSS phone mockup (the real overlay pill + progress bar + toast, abstract gradient "videos" — no Instagram UI or logo)
  - Features (auto-advance, seeking, speed) · shortcuts · 3-step install · privacy (`storage` only, no network) · footer + "not affiliated with Instagram/Meta"
  - i18n: English text in HTML (no-JS/SEO), TR dictionary in `app.js`; first visit uses `navigator.language`, choice saved in localStorage (try/catch)
  - Light/dark theme, 16px gutter at phone width, `prefers-reduced-motion`
- [x] `README.md` rewrite (EN) + `README.tr.md`; language switcher at the top, site + download links, note that the interface is in Turkish
- [x] Verification: headless Brave screenshots at 390px and 1280px, TR/EN toggle, console errors; `node --test`
- [ ] Commit on `main` + push
- [ ] Make the repo public, set description/homepage, enable Pages (`main` /docs)
- [ ] `reel-pilot.zip` (built from `dist/` after the v0.2.0 build) → `gh release create v0.2.0`
- [ ] Live check: Pages URL + download link

**On hold (2026-11-27):** another session is doing a v0.2.0 TypeScript/esbuild rewrite in the same working tree.
User decision: wait for v0.2.0. Then: align the README's "How it works / Development / release" sections and the site
copy with v0.2.0 (`npm run build`, Load unpacked `dist/`, new features) → commit only these files → push → public →
Pages → release v0.2.0.

---

# v0.2 — TypeScript rewrite + viewing pack, reel record, filters, Creator HUD

Decisions (user): all four bundles (A viewing pack, B feed filters, C history + collection, D Creator HUD) ·
Instagram only · TypeScript + esbuild · the user verifies the logged-in session in Brave at each stop.

- [x] **M0 — Port.** Toolchain (`npm run check`, `npm run build` → `dist/`), 1:1 TypeScript port of core / overlay /
  content, shutdown when the extension context is gone, "Tanılama kopyala" in the popup
- [x] **M1 — Viewing pack.** Hold `F` to boost, frame step `,` `.`, copy frame `C`, A-B loop `[` `]` `\`,
  stay lock `K`, auto-advance gates (typing, lock, loop, break), break reminder after N reels / M minutes
- [ ] **Stop 1 (user):** load `dist/` in Brave, logged in; run the checklist; paste the diagnostics
- [ ] **M2 — Identity + data + HUD.** ReelTracker (code from the path), MAIN-world hook, extractor, HUD chips
- [ ] **M3 — History + collection.** Service worker, IndexedDB, thumbnails, save with `B`, library page, export
- [ ] **M4 — Filters.** Skip watched, by duration, blocked accounts / keywords / hashtags, sponsored (best effort)
- [ ] **M5 — Loudness levelling** (experimental, off by default)

## Review — M0 + M1

Verified on the live Reels page (headless Chromium, logged out, `dist/content.js` injected with a storage shim):
v0.1 parity (speed on every reel and kept across an advance, arrow seek, advance at the end); boost 1x→2x and
1.5x→3x, released on keyup and on blur, `defaultPlaybackRate` untouched; frame step pauses and moves one frame;
A-B loop stays inside the range and shows its markers; lock and a focused text field both keep the reel at its end,
unlocking lets it advance; break banner pauses the next reel and "Devam et" resumes it; diagnostics report.

Found and fixed: after a frame step pauses the video, Instagram still believes it is playing, so one click did
nothing. The first click on a stepped video is now handled by the extension; Instagram's own toggle works after it.

Not verified: clipboard copy of a frame (headless has no clipboard; the download fallback ran instead), the real
extension install, and everything specific to a logged-in session.

Deviation from the plan: M0 and M1 are one commit, because the port and the new rules share files.
