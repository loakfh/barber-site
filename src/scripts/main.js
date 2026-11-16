// Движение и интерактив страницы. Анимируются только transform и opacity.
// prefers-reduced-motion отключает сцены, параллакс, интро и бегущую строку.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 900px)');
const $ = (id) => document.getElementById(id);
const root = document.documentElement;

/* ---------- интро: пропуск по тапу ---------- */
(function intro() {
  const box = $('intro');
  if (!box || !root.classList.contains('intro-on')) return;
  try {
    sessionStorage.setItem('intro', '1');
  } catch {
    /* без памяти интро покажется ещё раз — не страшно */
  }
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    box.classList.add('out');
    setTimeout(() => root.classList.remove('intro-on'), 420);
  };
  box.addEventListener('click', close);
  addEventListener('keydown', close, { once: true });
  setTimeout(close, 1500);
})();

/* ---------- появление блоков ---------- */
if ('IntersectionObserver' in window && !calm) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
  );
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));
}

/* ---------- видео и бегущая строка работают только в кадре ---------- */
if ('IntersectionObserver' in window) {
  if (!calm) {
    const vio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.25 });
    document.querySelectorAll('video[data-auto]').forEach((v) => vio.observe(v));
  }
  const tapeIo = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('run', e.isIntersecting)));
  document.querySelectorAll('.tape').forEach((el) => tapeIo.observe(el));
}

/* ---------- сцены: прокрутка двигает пространство ----------
   Каждой сцене [data-scene] ставится --p от 0 до 1: сколько её уже пролистано.
   Что именно движется, описано в CSS (масштаб, сдвиг, затемнение). */
const scenes = [...document.querySelectorAll('[data-scene]')].map((el) => ({ el, on: false }));
const rail = document.querySelector('[data-rail]');
const railList = $('rail');
let railMax = 0;

function measureRail() {
  if (!rail) return;
  if (calm || !desktop.matches) {
    rail.style.height = '';
    railList.style.transform = '';
    railMax = 0;
    return;
  }
  railMax = Math.max(0, railList.scrollWidth - rail.clientWidth);
  // высота сцены = экран + столько, сколько нужно проехать вбок
  rail.style.height = railMax ? `${innerHeight + railMax}px` : '';
}

let queued = false;
function paint() {
  queued = false;
  for (const s of scenes) {
    if (!s.on) continue;
    const r = s.el.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    s.el.style.setProperty('--p', p.toFixed(4));
  }
  if (railMax) {
    const r = rail.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    railList.style.transform = `translate3d(${(-p * railMax).toFixed(1)}px,0,0)`;
  }
}
if (!calm) {
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((es) =>
      es.forEach((e) => {
        const s = scenes.find((x) => x.el === e.target);
        if (s) s.on = e.isIntersecting;
      }),
    );
    scenes.forEach((s) => seen.observe(s.el));
  } else scenes.forEach((s) => (s.on = true));
  const ask = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', () => {
    measureRail();
    ask();
  });
  addEventListener('load', () => {
    measureRail();
    ask();
  });
  measureRail();
  paint();
}

/* ---------- галерея: фильтр и просмотр на весь экран ---------- */
(function gallery() {
  const lb = $('lb');
  const track = $('lbTrack');
  const counter = $('lbN');
  if (!railList || !lb) return;
  let filter = document.querySelector('.chip[aria-pressed=true]')?.dataset.filter;
  const shots = [...railList.children];
  const slides = [...track.children];
  const visible = () => slides.filter((s) => !s.hidden);

  document.querySelectorAll('.chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      filter = chip.dataset.filter;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      shots.forEach((s, i) => {
        const hide = s.dataset.type !== filter;
        s.hidden = hide;
        slides[i].hidden = hide;
      });
      railList.scrollTo({ left: 0 });
      measureRail();
      paint();
    }),
  );

  const count = () => {
    const list = visible();
    const i = Math.round(track.scrollLeft / track.clientWidth);
    counter.textContent = `${Math.min(list.length, i + 1)} / ${list.length}`;
  };
  railList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    lb.showModal();
    const i = visible().indexOf(slides[Number(b.dataset.open)]);
    track.scrollTo({ left: i * track.clientWidth, behavior: 'instant' });
    count();
  });
  track.addEventListener('scroll', count, { passive: true });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') track.scrollBy({ left: track.clientWidth, behavior: calm ? 'auto' : 'smooth' });
    if (e.key === 'ArrowLeft') track.scrollBy({ left: -track.clientWidth, behavior: calm ? 'auto' : 'smooth' });
  });
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target === track || e.target.tagName === 'LI') lb.close();
  });
})();

/* ---------- нижняя панель появляется после первого экрана: две кнопки «Записаться» рядом не стоят ---------- */
(function bar() {
  const bar = $('bar');
  if (!bar) return;
  let q = false;
  let seat = false; // кнопка записи на сиденье кресла в кадре
  const sync = () => {
    q = false;
    bar.classList.toggle('hide', seat || scrollY < innerHeight * 0.6);
  };
  const seatBtn = document.querySelector('.ch-seat .btn');
  if (seatBtn && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      seat = es[0].isIntersecting;
      sync();
    }).observe(seatBtn);
  }
  addEventListener('scroll', () => {
    if (q) return;
    q = true;
    requestAnimationFrame(sync);
  }, { passive: true });
  sync();
})();

/* ---------- кнопки «скопировать» ---------- */
const toast = $('toast');
const say = (text) => {
  toast.textContent = text;
  toast.classList.add('on');
  clearTimeout(say.t);
  say.t = setTimeout(() => toast.classList.remove('on'), 2400);
};
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try {
    await navigator.clipboard.writeText(b.dataset.copy);
    say('Скопировано');
  } catch {
    say('Не получилось скопировать, выделите текст вручную');
  }
});

/* ---------- выбор локации для маршрута ---------- */
const routes = $('routes');
document.querySelector('[data-route]')?.addEventListener('click', () => routes?.showModal());
routes?.addEventListener('click', (e) => {
  if (e.target === routes) routes.close();
});

/* ---------- карта Яндекса: грузится, только когда до неё долистали ---------- */
(function map() {
  const box = $('map');
  if (!box || !('IntersectionObserver' in window)) return;
  const cfg = JSON.parse($('cfg').textContent);
  const pick = (id) => {
    document.querySelectorAll('.loc').forEach((el) => el.classList.toggle('picked', el.dataset.loc === id));
    document.getElementById(`loc-${id}`)?.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  };
  const io = new IntersectionObserver(
    (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const s = document.createElement('script');
      s.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${cfg.mapsKey ? `&apikey=${cfg.mapsKey}` : ''}`;
      s.onerror = () => (box.querySelector('.map-ph').textContent = 'Карта не загрузилась. Адреса и маршруты есть в карточках.');
      s.onload = () =>
        window.ymaps.ready(() => {
          box.textContent = '';
          const m = new window.ymaps.Map(box, { center: cfg.locations[0].coords, zoom: 11, controls: ['zoomControl'] });
          cfg.locations.forEach((l) => {
            const mark = new window.ymaps.Placemark(l.coords, { hintContent: `м. ${l.metro}` }, { preset: 'islands#blackDotIcon' });
            mark.events.add('click', () => pick(l.id));
            m.geoObjects.add(mark);
          });
          if (cfg.locations.length > 1) m.setBounds(m.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
          m.behaviors.disable('scrollZoom');
        });
      document.head.append(s);
    },
    { rootMargin: '300px' },
  );
  io.observe(box);
})();
