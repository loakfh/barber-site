// Панель записи: один изолированный компонент.
// Это заявка, а не бронь: сайт ничего не хранит и никуда не отправляет,
// сообщение собирается в браузере и открывается в мессенджере.

const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// подписи панели на двух языках
const L = {
  ru: {
    wdShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    wdFull: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    today: 'сегодня',
    tomorrow: 'завтра',
    hello: 'Здравствуйте, Тамер! Хочу записаться',
    pickAll: 'Выберите место, день и удобное время',
    pickPlace: 'Нажмите на адрес, куда вам удобнее прийти',
    noPlace: 'Напишите Тамеру: он предложит место и время',
    place: 'Куда вам удобнее прийти?',
    day: 'День',
    time: 'Удобное время',
    timeInChat: 'Удобный день и время напишите в чате: Тамер ответит, когда сможет принять.',
    noDays: 'В ближайшие две недели здесь нет приёма. Выберите другое место или напишите Тамеру.',
    service: 'Услуга, если уже выбрали',
    copiedMax: 'Сообщение скопировано, вставьте его в чат',
    copiedMaxFind: 'Сообщение скопировано. Найдите Тамера в MAX по номеру',
    copied: 'Сообщение скопировано на случай, если не подставится',
    open: 'сейчас принимает',
    closed: 'сейчас не принимает',
  },
  tr: {
    wdShort: ['paz', 'pzt', 'sal', 'çar', 'per', 'cum', 'cmt'],
    wdFull: ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'],
    months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    today: 'bugün',
    tomorrow: 'yarın',
    hello: 'Merhaba Tamer! Randevu almak istiyorum',
    pickAll: 'Yer, gün ve uygun saati seçin',
    pickPlace: 'Size uygun adrese dokunun',
    noPlace: "Tamer'e yazın: yer ve saat önerecek",
    place: 'Size hangi adres uygun?',
    day: 'Gün',
    time: 'Uygun saat',
    timeInChat: 'Uygun gün ve saati sohbette yazın: Tamer ne zaman kabul edebileceğini söyler.',
    noDays: "Önümüzdeki iki hafta burada kabul yok. Başka bir yer seçin ya da Tamer'e yazın.",
    service: 'Hizmet, seçtiyseniz',
    copiedMax: 'Mesaj kopyalandı, sohbete yapıştırın',
    copiedMaxFind: "Mesaj kopyalandı. MAX'te Tamer'i şu numarayla bulun:",
    copied: 'Mesaj kopyalandı: sohbette görünmezse yapıştırın',
    open: 'şu an kabul ediyor',
    closed: 'şu an kabul etmiyor',
  },
};
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
export function getAvailability(location, booking, now = moscowNow(), lang = 'ru') {
  const days = [];
  const t = L[lang] || L.ru;
  if (!location.hours) return days;
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
    const dm = `${date.getUTCDate()} ${t.months[date.getUTCMonth()]}`;
    days.push({
      key: date.toISOString().slice(0, 10),
      short: `${i === 0 ? t.today : i === 1 ? t.tomorrow : t.wdShort[date.getUTCDay()]}, ${dm}`,
      full: `${t.wdFull[date.getUTCDay()]}, ${dm}`,
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

export function buildMessage({ service, day, time, location }, lang = 'ru') {
  const hello = (L[lang] || L.ru).hello;
  const parts = [service?.title, day?.full, time, location?.msg].filter(Boolean);
  return parts.length ? `${hello}: ${parts.join(', ')}.` : `${hello}.`;
}

export function buildLink(messenger, text, contacts) {
  const q = encodeURIComponent(text);
  if (messenger === 'telegram') return `https://t.me/${contacts.telegram}?text=${q}`;
  if (messenger === 'whatsapp') return `https://wa.me/${contacts.whatsapp}?text=${q}`;
  return contacts.maxUrl || 'https://max.ru/'; // в MAX текст в личный чат подставить нельзя: только копируем
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
  const lang = cfg.lang || 'ru';
  const t = L[lang] || L.ru;
  const anyHours = cfg.locations.some((l) => l.hours);
  const messengers = MESSENGERS; // MAX есть всегда: без ссылки на профиль клиент ищет Тамера по номеру
  const state = { service: null, location: null, day: null, time: null };
  let days = [];

  const say = (text) => {
    toast.textContent = text;
    toast.classList.add('on');
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.remove('on'), 3200);
  };
  // у локации без графика достаточно выбрать место: время обсуждают в чате
  const ready = () => !hasLoc || (state.location && (!state.location.hours || (state.day && state.time)));
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const opt = (kind, value, label, on, extra = '') =>
    `<button type="button" class="opt${on ? ' on' : ''}" data-kind="${kind}" data-value="${esc(value)}" aria-pressed="${on}">${label}${extra}</button>`;

  function render() {
    const picked = [state.service?.title, state.location?.title, state.day?.short, state.time].filter(Boolean);
    sum.textContent = picked.length ? picked.join(' · ') : hasLoc ? (anyHours ? t.pickAll : t.pickPlace) : t.noPlace;

    let html = '';
    if (hasLoc) {
      html += `<fieldset><legend>${anyHours ? '1. ' : ''}${t.place}</legend><div class="opts col">${cfg.locations
        .map((l) => opt('location', l.id, `<b>${esc(l.title)}</b>${l.sub ? `<small>${esc(l.sub)}</small>` : ''}`, state.location?.id === l.id))
        .join('')}</div></fieldset>`;
      if (state.location && !state.location.hours) html += `<p class="bk-note">${t.timeInChat}</p>`;
      if (state.location?.hours) {
        html += `<fieldset><legend>2. ${t.day}</legend><div class="opts row">${
          days.length ? days.map((d) => opt('day', d.key, esc(d.short), state.day?.key === d.key)).join('') : `<p class="bk-empty">${t.noDays}</p>`
        }</div></fieldset>`;
      }
      if (state.day) {
        html += `<fieldset><legend>3. ${t.time}</legend><div class="opts grid">${state.day.times.map((t) => opt('time', t, t, state.time === t)).join('')}</div></fieldset>`;
      }
    }
    if (cfg.services.length) html += `<fieldset><legend>${t.service}</legend><div class="opts row">${cfg.services
      .map((s) => opt('service', s.id, esc(s.title), state.service?.id === s.id))
      .join('')}</div></fieldset>`;
    body.innerHTML = html;
    // после перерисовки выбранный день и услуга остаются в поле зрения своей ленты
    body.querySelectorAll('.opts.row .opt.on').forEach((el) => (el.parentElement.scrollLeft = Math.max(0, el.offsetLeft - el.parentElement.offsetLeft - 20)));

    const text = buildMessage(state, lang);
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
      days = getAvailability(state.location, cfg.booking, moscowNow(), lang);
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
    const text = buildMessage(state, lang);
    remember.set(a.dataset.m);
    // текст копируется для всех трёх мессенджеров: если черновик не подставится, клиент вставит сам
    const done = () => say(a.dataset.m !== 'max' ? t.copied : cfg.contacts.maxUrl ? t.copiedMax : `${t.copiedMaxFind} ${cfg.contacts.phoneDisplay}`);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    // переход по ссылке выполняет сам браузер (href уже собран)
  });

  function open({ service, location } = {}) {
    if (service) state.service = cfg.services.find((s) => s.id === service) || state.service;
    if (location) {
      state.location = cfg.locations.find((l) => l.id === location) || null;
      days = state.location ? getAvailability(state.location, cfg.booking, moscowNow(), lang) : [];
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
      el.textContent = on ? t.open : t.closed;
      el.classList.toggle('on', on);
    });
  if (anyHours) {
    paintStatus();
    setInterval(paintStatus, 60000);
  }
}
