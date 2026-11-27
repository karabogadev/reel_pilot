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
