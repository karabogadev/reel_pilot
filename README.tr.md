<p align="center">
  <img src="icons/icon-128.png" width="88" height="88" alt="Reel Pilot simgesi" />
</p>

<h1 align="center">Reel Pilot</h1>

<p align="center">
  Web'deki Instagram Reels için otomatik geçiş, ilerleme çubuğu, 0.25x–4x hız ve izleme araçları.<br />
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
- **Hız.** 0.25x–4x; hatırlanır ve sonraki her reel'e uygulanır. `F`'ye basılı tutunca hız iki katına çıkar.
- **İzleme araçları.** Kare kare ilerle, o anki kareyi resim olarak kopyala, reel'in bir bölümünü döngüye al (A-B
  döngü) ya da sonrakine geçmeden bir reel'de kal.
- **Mola hatırlatıcı.** Seçtiğin sayıda reel ya da dakika sonunda durur; devam et diyene kadar bekler.

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
| `F` (basılı) | Basılı tuttukça iki kat hız |
| `,` / `.` | Önceki / sonraki kare (reel'i duraklatır) |
| `C` | O anki kareyi kopyala (pano engelliyse indirir) |
| `[` / `]` / `\` | A-B döngü: başlangıç / bitiş / temizle |
| `A` | Otomatik geçişi aç/kapa (yalnızca Reels akışında) |
| `K` | Bu reel'de kal (yalnızca Reels akışında) |

Yazı yazarken kısayollar devre dışıdır; popup'tan tamamen kapatılabilir. Sarma adımı (2–15 sn) ve mola hatırlatıcı da
oradan ayarlanır.

## Gizlilik

- Yalnızca `instagram.com`'da çalışır, Hikâyeler'de kapalı kalır.
- İstediği tek izin `storage`; ayarlarını tarayıcıda saklamak için.
- Ağ isteği yok, analitik yok, hesap yok.
- Popup'taki **Tanılama kopyala**, hata bildirimi için panoya bir rapor kopyalar. Raporda URL, reel kodu ya da hesap
  adı yoktur ve hiçbir yere gönderilmez.

## Nasıl çalışır

Eklenti Instagram'ın class adlarına ya da seçicilerine hiç dayanmaz. Capture fazındaki medya event'lerini, ekranın
ortasına en yakın videoyu izleyen tek bir `requestAnimationFrame` döngüsünü ve `<html>`'e eklenen sabit bir Shadow DOM
katmanını kullanır. Ayarlar `chrome.storage.local`'da durur; popup ve sayfa içi kontroller yalnızca oraya yazar.

| Yol | Ne |
| --- | --- |
| `src/core/` | Saf mantık (ayarlar, tuşlar, oynatma, rota); testler bunu kapsar |
| `src/content/runtime.ts` | Aktif video, hız, otomatik geçiş ve kare döngüsü |
| `src/content/overlay.ts` | Sayfa içi arayüz |
| `src/content/features/` | İzleme araçları ve mola hatırlatıcı; runtime'ın üstüne kurulu |
| `src/pages/popup/` | Ayarlar |
| `docs/` | [Web sitesi](https://karabogadev.github.io/reel_pilot/) (GitHub Pages) |

## Geliştirme

TypeScript; esbuild ile `dist/`'e paketlenir. Testler TypeScript'i doğrudan çalıştırdığı için Node 22.18 ya da
üstü gerekir.

```sh
npm install
npm run build   # dist/'e paketle (npm run dev değişiklikte yeniden paketler)
npm run check   # tip kontrolü, lint ve testler
```

**Paketlenmemiş öğe yükle** ile `dist/` klasörünü yükle. Yeniden paketledikten sonra eklenti kartındaki yenile
düğmesine bas ve Instagram sekmesini yenile.

Sürüm çıkarmak için `package.json`'daki `version`'ı artır (build onu manifest'e kopyalar), sonra `dist/`'in içeriğini
sabit bir adla zip'le; böylece yukarıdaki indirme bağlantısı hep en son sürümü gösterir:

```sh
npm run check && npm run build
(cd dist && zip -r ../reel-pilot.zip .)
gh release create v0.2.0 reel-pilot.zip
```

---

Reel Pilot bağımsız bir projedir; Instagram ya da Meta ile bağlantısı yoktur.
