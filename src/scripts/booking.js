// Панель записи: один изолированный компонент.
// Это заявка, а не бронь: сайт ничего не хранит и никуда не отправляет,
// сообщение собирается в браузере и открывается в мессенджере.

const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MESSENGERS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'max', label: 'MAX' },
];
const pad = (n) => String(n).padStart(2, '0');
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Текущее время в Москве, независимо от часового пояса телефона. */
export function moscowNow(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/**
 * ЕДИНСТВЕННЫЙ источник доступного времени. Сейчас читает график локации из конфига.
 * Чтобы подключить настоящие слоты, замените тело функции: верните тот же формат
 * [{ key, short, full, times: ['10:00', ...] }]. Остальная панель не изменится.
 */
export function getAvailability(location, booking, now = moscowNow()) {
  const days = [];
  for (let i = 0; i < booking.daysAhead; i++) {
    const date = new Date(Date.UTC(now.y, now.m - 1, now.d + i));
    const hours = location.hours?.[WD[date.getUTCDay()]];
    if (!hours) continue;
    const times = [];
    for (let t = toMin(hours[0]); t + booking.stepMinutes <= toMin(hours[1]); t += booking.stepMinutes) {
      if (i === 0 && t <= now.minutes) continue; // прошедшее время сегодня скрыто
      times.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
    }
    if (!times.length) continue;
    const dm = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
    days.push({
      key: date.toISOString().slice(0, 10),
      short: `${i === 0 ? 'сегодня' : i === 1 ? 'завтра' : WD_SHORT[date.getUTCDay()]}, ${dm}`,
      full: `${WD_FULL[date.getUTCDay()]}, ${dm}`,
      times,
    });
  }
  return days;
}

/** Принимает ли локация прямо сейчас (по московскому времени). */
export function isOpenNow(location, now = moscowNow()) {
  const hours = location.hours?.[WD[new Date(Date.UTC(now.y, now.m - 1, now.d)).getUTCDay()]];
  return Boolean(hours) && now.minutes >= toMin(hours[0]) && now.minutes < toMin(hours[1]);
}

export function buildMessage({ service, day, time, location }) {
  const parts = [service?.title, day?.full, time, location && `${location.name}, м. ${location.metro}`].filter(Boolean);
  return parts.length ? `Здравствуйте, Тамер! Хочу записаться: ${parts.join(', ')}.` : 'Здравствуйте, Тамер! Хочу записаться.';
}

export function buildLink(messenger, text, contacts) {
  const q = encodeURIComponent(text);
  if (messenger === 'telegram') return `https://t.me/${contacts.telegram}?text=${q}`;
  if (messenger === 'whatsapp') return `https://wa.me/${contacts.whatsapp}?text=${q}`;
  return contacts.maxUrl; // в MAX текст в личный чат подставить нельзя: только копируем
}

const remember = {
  get() {
    try {
      return localStorage.getItem('messenger');
    } catch {
      return null;
    }
  },
  set(v) {
    try {
      localStorage.setItem('messenger', v);
    } catch {
      /* приватный режим: живём без памяти */
    }
  },
};

export function initBooking(cfg) {
  const dlg = document.getElementById('booking');
  if (!dlg) return;
  const body = document.getElementById('bkBody');
  const sum = document.getElementById('bkSum');
  const btns = document.getElementById('bkBtns');
  const toast = document.getElementById('toast');
  const hasLoc = cfg.locations.length > 0;
  const messengers = MESSENGERS.filter((m) => m.id !== 'max' || cfg.contacts.maxUrl);
  const state = { service: null, location: null, day: null, time: null };
  let days = [];

  const say = (text) => {
    toast.textContent = text;
    toast.classList.add('on');
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.remove('on'), 3200);
  };
  const ready = () => !hasLoc || (state.location && state.day && state.time);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const opt = (kind, value, label, on, extra = '') =>
    `<button type="button" class="opt${on ? ' on' : ''}" data-kind="${kind}" data-value="${esc(value)}" aria-pressed="${on}">${label}${extra}</button>`;

  function render() {
    const picked = [state.service?.title, state.location && `м. ${state.location.metro}`, state.day?.short, state.time].filter(Boolean);
    sum.textContent = picked.length ? picked.join(' · ') : hasLoc ? 'Выберите место, день и удобное время' : 'Напишите Тамеру: он предложит место и время';

    let html = '';
    if (hasLoc) {
      html += `<fieldset><legend>1. Место</legend><div class="opts col">${cfg.locations
        .map((l) => opt('location', l.id, `<b>м. ${esc(l.metro)}</b><small>${esc(l.address)}</small>`, state.location?.id === l.id))
        .join('')}</div></fieldset>`;
      if (state.location) {
        html += `<fieldset><legend>2. День</legend><div class="opts row">${
          days.length ? days.map((d) => opt('day', d.key, esc(d.short), state.day?.key === d.key)).join('') : '<p class="bk-empty">В ближайшие две недели здесь нет приёма. Выберите другое место или напишите Тамеру.</p>'
        }</div></fieldset>`;
      }
      if (state.day) {
        html += `<fieldset><legend>3. Удобное время</legend><div class="opts grid">${state.day.times.map((t) => opt('time', t, t, state.time === t)).join('')}</div></fieldset>`;
      }
    }
    if (cfg.services.length) html += `<fieldset><legend>${hasLoc ? 'Услуга, если уже выбрали' : 'Услуга, если уже знаете'}</legend><div class="opts row">${cfg.services
      .map((s) => opt('service', s.id, esc(s.title), state.service?.id === s.id))
      .join('')}</div></fieldset>`;
    body.innerHTML = html;
    // после перерисовки выбранный день и услуга остаются в поле зрения своей ленты
    body.querySelectorAll('.opts.row .opt.on').forEach((el) => (el.parentElement.scrollLeft = Math.max(0, el.offsetLeft - el.parentElement.offsetLeft - 20)));

    const text = buildMessage(state);
    const last = remember.get();
    const order = [...messengers].sort((a, b) => (b.id === last) - (a.id === last));
    btns.innerHTML = order
      .map((m) =>
        ready()
          ? `<a class="send${m.id === last ? ' last' : ''}" data-m="${m.id}" href="${esc(buildLink(m.id, text, cfg.contacts))}" target="_blank" rel="noopener">${m.label}</a>`
          : `<span class="send off" aria-disabled="true">${m.label}</span>`,
      )
      .join('');
  }

  body.addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    const { kind, value } = b.dataset;
    if (kind === 'location') {
      state.location = cfg.locations.find((l) => l.id === value);
      days = getAvailability(state.location, cfg.booking);
      state.day = null;
      state.time = null;
    } else if (kind === 'day') {
      state.day = days.find((d) => d.key === value);
      state.time = null;
    } else if (kind === 'time') {
      state.time = value;
    } else if (kind === 'service') {
      state.service = state.service?.id === value ? null : cfg.services.find((s) => s.id === value);
    }
    render();
    // следующий шаг подъезжает в поле зрения
    const next = body.querySelector('fieldset:nth-last-of-type(2)');
    if (kind !== 'service' && kind !== 'time' && next) next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  btns.addEventListener('click', (e) => {
    const a = e.target.closest('a.send');
    if (!a) return;
    const text = buildMessage(state);
    remember.set(a.dataset.m);
    // текст копируется для всех трёх мессенджеров: если черновик не подставится, клиент вставит сам
    const done = () => say(a.dataset.m === 'max' ? 'Сообщение скопировано, вставьте его в чат' : 'Сообщение скопировано на случай, если не подставится');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    // переход по ссылке выполняет сам браузер (href уже собран)
  });

  function open({ service, location } = {}) {
    if (service) state.service = cfg.services.find((s) => s.id === service) || state.service;
    if (location) {
      state.location = cfg.locations.find((l) => l.id === location) || null;
      days = state.location ? getAvailability(state.location, cfg.booking) : [];
      state.day = null;
      state.time = null;
    }
    render();
    if (!dlg.open) dlg.showModal();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (t) open({ service: t.dataset.service, location: t.dataset.location });
  });
  // тап по затемнению закрывает панель
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  // статус «сейчас принимает» по каждой локации отдельно
  const paintStatus = () =>
    document.querySelectorAll('[data-status]').forEach((el) => {
      const loc = cfg.locations.find((l) => l.id === el.dataset.status);
      const on = isOpenNow(loc);
      el.textContent = on ? 'сейчас принимает' : 'сейчас не принимает';
      el.classList.toggle('on', on);
    });
  if (hasLoc) {
    paintStatus();
    setInterval(paintStatus, 60000);
  }
}
