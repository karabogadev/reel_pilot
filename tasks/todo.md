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
