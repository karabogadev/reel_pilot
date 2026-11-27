<p align="center">
  <img src="icons/icon-128.png" width="88" height="88" alt="Reel Pilot simgesi" />
</p>

<h1 align="center">Reel Pilot</h1>

<p align="center">
  Web'deki Instagram Reels için otomatik geçiş, ilerleme çubuğu ve 0.25x–4x hız.<br />
  <a href="https://karabogadev.github.io/reel_pilot/">Web sitesi</a> ·
  <a href="https://github.com/karabogadev/reel_pilot/releases/latest/download/reel-pilot.zip">İndir</a> ·
  <a href="README.md">English</a> | <b>Türkçe</b>
</p>

---

Reel Pilot; Brave, Chrome ve diğer Chromium tarayıcılar için küçük bir Manifest V3 eklentisidir. Instagram Reels'in
masaüstünde eksik olan kontrollerini ekler:

- **Otomatik geçiş.** Reel bitince sonrakine kaydırır. Her reel, geçmeden önce 1–5 kez oynayabilir.
- **Sarma.** Her reel'in alt kenarında sürüklenebilir bir ilerleme çubuğu (üstüne gelince süre görünür) ve klavyeyle
  sarma.
- **Hız.** 0.25x–4x; hatırlanır ve sonraki her reel'e uygulanır.

## Kurulum

1. [`reel-pilot.zip`](https://github.com/karabogadev/reel_pilot/releases/latest/download/reel-pilot.zip) dosyasını
   indir ve kalıcı bir klasöre çıkar.
2. `brave://extensions` ya da `chrome://extensions` sayfasını aç ve **Geliştirici modu**'nu aç.
3. **Paketlenmemiş öğe yükle**'ye tıkla, çıkardığın klasörü seç, ardından
   [instagram.com/reels](https://www.instagram.com/reels/) adresini aç.

Güncellemek için klasörü yeni sürümle değiştir ve eklenti kartındaki yenile düğmesine bas.

## Kısayollar

| Tuş | İşlev |
| --- | --- |
| `←` / `→` | Geri / ileri sar (yalnızca Reels akışında) |
| `S` / `D` | Yavaşlat / hızlandır |
| `R` | Hızı 1x yap |
| `A` | Otomatik geçişi aç/kapa (yalnızca Reels akışında) |

Yazı yazarken kısayollar devre dışıdır; popup'tan tamamen kapatılabilir. Sarma adımı (2–15 sn) da oradan ayarlanır.

## Gizlilik

- Yalnızca `instagram.com`'da çalışır, Hikâyeler'de kapalı kalır.
- İstediği tek izin `storage`; ayarlarını tarayıcıda saklamak için.
- Ağ isteği yok, analitik yok, hesap yok.

## Nasıl çalışır

Eklenti Instagram'ın class adlarına ya da seçicilerine hiç dayanmaz. Capture fazındaki medya event'lerini, ekranın
ortasına en yakın videoyu izleyen tek bir `requestAnimationFrame` döngüsünü ve `<html>`'e eklenen sabit bir Shadow DOM
katmanını kullanır. Ayarlar `chrome.storage.local`'da durur; popup ve sayfa içi kontroller yalnızca oraya yazar.

| Yol | Ne |
| --- | --- |
| `src/core.js` | Saf mantık; content script, popup ve testler ortak kullanır |
| `src/overlay.js` | Sayfa içi arayüz |
| `src/content.js` | Bağlantılar |
| `popup/` | Ayarlar |
| `docs/` | [Web sitesi](https://karabogadev.github.io/reel_pilot/) (GitHub Pages) |

## Geliştirme

**Paketlenmemiş öğe yükle** ile doğrudan repo klasörünü yükle. Kodu değiştirdikten sonra eklenti kartındaki yenile
düğmesine bas ve Instagram sekmesini yenile.

```sh
node --test                  # src/core.js birim testleri
node scripts/make-icons.mjs  # ikonları yeniden üret
```

Sürüm çıkarmak için yalnızca eklenti dosyalarını zip'le ve sabit bir adla ekle; böylece yukarıdaki indirme bağlantısı
hep en son sürümü gösterir:

```sh
zip -r reel-pilot.zip manifest.json icons popup src
gh release create v0.1.0 reel-pilot.zip
```

---

Reel Pilot bağımsız bir projedir; Instagram ya da Meta ile bağlantısı yoktur.
