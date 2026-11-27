/**
 * Reel Pilot site: language toggle and the live demo in the hero.
 * English lives in index.html (so the page works without JS); Turkish lives here.
 */
(() => {
  'use strict';

  // ---- Language -----------------------------------------------------------

  const TR = {
    'meta.title': 'Reel Pilot: Instagram Reels için otomatik geçiş, sarma ve hız',
    'meta.description':
      'Biten reel’den sonrakine geçen, her reel’e ilerleme çubuğu ekleyen ve oynatma hızını hatırlayan ücretsiz bir tarayıcı eklentisi.',
    'lang.label': 'Dil',
    'hero.title': 'Reels kendi kendine aksın.',
    'hero.lede':
      'Reel Pilot, Instagram Reels’in web’de eksik olan kontrollerini ekler. Biten reel’den sonrakine geçer, her videoya bir ilerleme çubuğu koyar ve oynatma hızını hatırlar.',
    'hero.download': 'Brave ve Chrome için indir',
    'hero.source': 'Kaynak kodu gör',
    'hero.fine': 'Ücretsiz ve açık kaynak. Masaüstündeki her Chromium tarayıcıda çalışır.',
    'demo.auto': 'Oto',
    'demo.slower': 'Yavaşlat',
    'demo.faster': 'Hızlandır',
    'demo.hint': 'Burada dene: tuşlara bas ya da dokun.',
    'key.back': 'Geri',
    'key.forward': 'İleri',
    'key.slower': 'Yavaşlat',
    'key.faster': 'Hızlandır',
    'key.reset': '1x’e dön',
    'key.auto': 'Oto geçiş',
    'features.title': 'Web oynatıcının yapamadığı üç şey',
    'f1.title': 'Sıradaki reel, kendiliğinden',
    'f1.body':
      'Bir reel bitince Reel Pilot sonrakine kaydırır. Önce bir daha mı izlemek istiyorsun? Her reel, geçmeden önce beş kereye kadar oynayabilir.',
    'f2.title': 'Sürüklenebilir ilerleme çubuğu',
    'f2.body':
      'Her reel’in altında ince bir ilerleme çubuğu var. Atlamak için tıkla ya da sürükle, süreyi görmek için üstüne gel ya da ok tuşlarını kullan.',
    'f3.title': '0.25x’ten 4x’e her hız',
    'f3.body': 'S ve D ile hızlandır ya da yavaşlat. Seçtiğin hız, R’ye basana kadar sonraki her reel’de de geçerli olur.',
    'install.title': 'Bir dakikada kur',
    's1.title': 'İndir ve klasöre çıkar',
    's1.body':
      '<a href="https://github.com/karabogadev/reel_pilot/releases/latest/download/reel-pilot.zip">reel-pilot.zip</a> dosyasını indir ve kalıcı bir klasöre çıkar. Tarayıcı eklentiyi o klasörden yükler.',
    's2.title': 'Geliştirici modunu aç',
    's2.body':
      '<code>brave://extensions</code> ya da <code>chrome://extensions</code> sayfasını aç ve köşedeki <strong>Geliştirici modu</strong> anahtarını aç.',
    's3.title': 'Klasörü yükle',
    's3.body':
      '<strong>Paketlenmemiş öğe yükle</strong> düğmesine tıkla, çıkardığın klasörü seç, ardından <a href="https://www.instagram.com/reels/">instagram.com/reels</a> adresini aç.',
    'install.note': '',
    'privacy.title': 'Tek bir izin istiyor',
    p1: 'Yalnızca instagram.com’da çalışır, Hikâyeler’de kapalı kalır.',
    p2: 'Ayarlarını tarayıcının eklenti deposunda tutar. İstediği tek izin bu.',
    p3: 'Hiçbir yere bir şey göndermez: ağ isteği yok, analitik yok, hesap yok.',
    p4: 'Instagram’ın class adlarına ya da seçicilerine dayanmaz; küçük tasarım değişiklikleri onu kolay kolay bozmaz.',
    'foot.disclaimer': 'Reel Pilot bağımsız bir projedir; Instagram ya da Meta ile bağlantısı yoktur.',
    'foot.source': 'Kaynak kod GitHub’da',
  };

  /** Strings the demo builds at runtime. */
  const LIVE = {
    en: { autoOn: 'Auto-advance on', autoOff: 'Auto-advance off', seconds: 's' },
    tr: { autoOn: 'Otomatik geçiş açık', autoOff: 'Otomatik geçiş kapalı', seconds: 'sn' },
  };

  const STORAGE_KEY = 'reel-pilot-lang';
  const text = [...document.querySelectorAll('[data-i18n]')];
  const html = [...document.querySelectorAll('[data-i18n-html]')];
  const attrs = [...document.querySelectorAll('[data-i18n-attr]')].map((el) => {
    const [name, key] = el.dataset.i18nAttr.split(':');
    return { el, name, key };
  });

  // Read the English copy back out of the page so it is written only once.
  const EN = {};
  for (const el of text) EN[el.dataset.i18n] = el.textContent.trim().replace(/\s+/g, ' ');
  for (const el of html) EN[el.dataset.i18nHtml] = el.innerHTML.trim().replace(/\s+/g, ' ');
  for (const { el, name, key } of attrs) EN[key] = el.getAttribute(name);

  let lang = 'en';

  function setLang(next) {
    lang = next === 'tr' ? 'tr' : 'en';
    const dict = lang === 'tr' ? TR : EN;
    const pick = (key) => (key in dict ? dict[key] : EN[key]);
    document.documentElement.lang = lang;
    for (const el of text) {
      const value = pick(el.dataset.i18n);
      el.textContent = value;
      el.hidden = value === '';
    }
    for (const el of html) el.innerHTML = pick(el.dataset.i18nHtml);
    for (const { el, name, key } of attrs) el.setAttribute(name, pick(key));
    for (const button of document.querySelectorAll('[data-lang]')) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    }
  }

  function storedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  for (const button of document.querySelectorAll('[data-lang]')) {
    button.addEventListener('click', () => {
      setLang(button.dataset.lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Private mode or blocked storage: the choice just isn't remembered.
      }
    });
  }

  const browserTr = (navigator.languages || [navigator.language]).some((l) => /^tr\b/i.test(l || ''));
  setLang(storedLang() || (browserTr ? 'tr' : 'en'));

  // ---- Demo -------------------------------------------------------------------

  const stage = document.getElementById('stage');
  if (!stage) return;

  const DURATION = 8; // seconds per demo reel at 1x
  const SEEK_STEP = 2;
  const END_GUARD = 0.25;
  const slides = [...stage.querySelectorAll('.slide')];
  const fill = document.getElementById('fill');
  const bar = document.getElementById('bar');
  const speedLabel = document.getElementById('speed');
  const autoButton = document.getElementById('auto');
  const toastEl = document.getElementById('toast');

  const state = { index: 0, time: 0, speed: 1, auto: true, visible: true, dragging: false };
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  let toastTimer = 0;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 900);
  }

  function renderSlides() {
    const n = slides.length;
    slides.forEach((slide, i) => {
      const offset = (i - state.index + n) % n;
      slide.classList.toggle('current', offset === 0);
      slide.classList.toggle('prev', offset === n - 1);
    });
  }

  function advance() {
    state.index = (state.index + 1) % slides.length;
    state.time = 0;
    renderSlides();
  }

  function setSpeed(speed) {
    state.speed = clamp(Math.round(speed * 4) / 4, 0.25, 4);
    speedLabel.textContent = `${state.speed}x`;
    toast(`${state.speed}x`);
  }

  function seekBy(dir) {
    state.time = clamp(state.time + dir * SEEK_STEP, 0, DURATION - END_GUARD);
    toast(`${dir > 0 ? '+' : '−'}${SEEK_STEP} ${LIVE[lang].seconds}`);
  }

  function toggleAuto() {
    state.auto = !state.auto;
    autoButton.setAttribute('aria-pressed', String(state.auto));
    toast(state.auto ? LIVE[lang].autoOn : LIVE[lang].autoOff);
  }

  const ACTIONS = {
    ArrowLeft: () => seekBy(-1),
    ArrowRight: () => seekBy(1),
    KeyS: () => setSpeed(state.speed - 0.25),
    KeyD: () => setSpeed(state.speed + 0.25),
    KeyR: () => setSpeed(1),
    KeyA: () => toggleAuto(),
  };

  // On-page key buttons and the overlay pill.
  const keyButtons = new Map();
  for (const button of document.querySelectorAll('[data-key]')) {
    keyButtons.set(button.dataset.key, button);
    button.addEventListener('click', () => ACTIONS[button.dataset.key]());
  }
  const PILL = { slower: 'KeyS', faster: 'KeyD', reset: 'KeyR', auto: 'KeyA' };
  for (const button of stage.querySelectorAll('[data-act]')) {
    button.addEventListener('click', () => ACTIONS[PILL[button.dataset.act]]());
  }

  function flash(code) {
    const button = keyButtons.get(code);
    if (!button) return;
    button.classList.add('pressed');
    setTimeout(() => button.classList.remove('pressed'), 140);
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !ACTIONS[e.code]) return;
    if (e.code === 'KeyA' && e.repeat) return;
    e.preventDefault();
    ACTIONS[e.code]();
    flash(e.code);
  });

  // Seek bar: click or drag.
  const ratioOf = (e) => {
    const r = bar.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  };
  const seekTo = (e) => {
    state.time = clamp(ratioOf(e) * DURATION, 0, DURATION - END_GUARD);
  };
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    state.dragging = true;
    stage.classList.add('drag');
    seekTo(e);
  });
  bar.addEventListener('pointermove', (e) => {
    if (state.dragging) seekTo(e);
  });
  const endDrag = () => {
    state.dragging = false;
    stage.classList.remove('drag');
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  // Only run the clock while the demo is on screen.
  new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
  }).observe(stage);

  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!state.visible || state.dragging) return render();
    state.time += dt * state.speed;
    if (state.time >= DURATION) {
      if (state.auto) advance();
      else state.time = 0; // Instagram's own behaviour: loop the same reel
    }
    render();
  }

  function render() {
    fill.style.transform = `scaleX(${(state.time / DURATION).toFixed(4)})`;
  }

  renderSlides();
  // Turn transitions on only after the first layout, so slides don't animate into place on load.
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('ready')));
  requestAnimationFrame(tick);
})();
