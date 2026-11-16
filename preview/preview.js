// Движение предпросмотра: появление блоков, лёгкий параллакс, видео только в кадре.
// Анимируются только transform и opacity; prefers-reduced-motion всё отключает.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

document.querySelectorAll('[data-noop]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

if ('IntersectionObserver' in window && !calm) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
  );
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));
}

// видео играет, только пока его видно
const video = document.querySelector('.bgv');
if (video && 'IntersectionObserver' in window && !calm) {
  new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause())), {
    threshold: 0.15,
  }).observe(video);
}

// бегущие строки стоят, пока их не видно
if ('IntersectionObserver' in window) {
  const mqIo = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('run', e.isIntersecting)));
  document.querySelectorAll('.mq').forEach((el) => mqIo.observe(el));
}

// параллакс: сдвиг считается только для элементов в кадре, раз в кадр анимации
if (!calm) {
  const items = [...document.querySelectorAll('[data-par]')].map((el) => ({ el, k: Number(el.dataset.par), on: false }));
  const seen = new IntersectionObserver((entries) =>
    entries.forEach((e) => {
      const it = items.find((i) => i.el === e.target);
      if (it) it.on = e.isIntersecting;
    }),
  );
  items.forEach((i) => seen.observe(i.el));
  let queued = false;
  const paint = () => {
    queued = false;
    const mid = innerHeight / 2;
    for (const it of items) {
      if (!it.on) continue;
      const r = it.el.parentElement.getBoundingClientRect();
      it.el.style.transform = `translate3d(0,${((r.top + r.height / 2 - mid) * it.k).toFixed(1)}px,0)`;
    }
  };
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    },
    { passive: true },
  );
  paint();
}
