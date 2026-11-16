// Собирает preview/index.html: пять вариантов дизайна подряд, в каждом три экрана.
// Запуск: npm run preview:build. Шрифты и медиа копируются внутрь preview/, наружу ничего не ходит.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const media = JSON.parse(readFileSync('content/media.json', 'utf8'));
const cfg = JSON.parse(readFileSync('content/site.config.json', 'utf8'));
const OUT = 'preview';
mkdirSync(`${OUT}/fonts`, { recursive: true });
// в предпросмотр идут только фото, которые стоят в макетах: остальные исходники наружу не выкладываем
const USED = ['hero-cutout', 'p01', 'p08', 'p13', 'p15', 'p16'];
mkdirSync(`${OUT}/media/photos`, { recursive: true });
for (const f of readdirSync('public/media/photos').filter((f) => USED.some((id) => f.startsWith(`${id}-`)))) cpSync(`public/media/photos/${f}`, `${OUT}/media/photos/${f}`);
mkdirSync(`${OUT}/media/video`, { recursive: true });
for (const f of readdirSync('public/media/video').filter((f) => f.startsWith('fire-1'))) cpSync(`public/media/video/${f}`, `${OUT}/media/video/${f}`);

/* ---------- шрифты: только нужные начертания и письменности ---------- */
const FONTS = [
  ['playfair-display', ['800', '400-italic']],
  ['inter-tight', ['300', '400', '600']],
  ['jost', ['400', '600']],
  ['caveat', ['700']],
  ['dela-gothic-one', ['400']],
  ['sofia-sans-extra-condensed', ['900']],
];
const FONT_SRC = ['node_modules/@fontsource', 'work/node_modules/@fontsource'].find((d) => existsSync(`${d}/jost`));
let fontCss = '';
for (const [pkg, variants] of FONTS) {
  for (const v of variants) {
    const css = readFileSync(`${FONT_SRC}/${pkg}/${v}.css`, 'utf8');
    for (const block of css.split('@font-face').slice(1)) {
      const file = block.match(/url\(\.\/files\/([^)]+\.woff2)\)/)?.[1];
      if (!file || !/-(latin|latin-ext|cyrillic)-\d/.test(file)) continue;
      cpSync(`${FONT_SRC}/${pkg}/files/${file}`, `${OUT}/fonts/${file}`);
      const pick = (prop) => block.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1];
      fontCss += `@font-face{font-family:${pick('font-family')};font-style:${pick('font-style')};font-weight:${pick('font-weight')};font-display:swap;src:url(fonts/${file}) format('woff2');unicode-range:${pick('unicode-range')}}\n`;
    }
  }
}
writeFileSync(`${OUT}/fonts.css`, fontCss);

/* ---------- кирпичики ---------- */
const ALT = {
  'hero-cutout': 'Тамер в чёрной рубашке и круглых тёмных очках, вполоборота',
  p01: 'Тамер смотрит на стрижку клиента сверху, крупный план',
  p07: 'Мужская стрижка с плавным переходом на затылке, вид сзади',
  p08: 'Мужская стрижка с боковым пробором и оформленной бородой, вид сбоку',
  p13: 'Опасная бритва снимает пену со щеки, крупный план',
  p15: 'Лицо в пене перед бритьём опасной бритвой, крупный план',
  p16: 'Тамер ровняет брови ножницами по расчёске, крупный план',
};
const pic = (id, sizes, cls = '', eager = false) => {
  const m = media.photos[id];
  const set = (ext) => m.widths.map((w) => `media/photos/${id}-${w}.${ext} ${w}w`).join(', ');
  return `<picture class="${cls}"><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><img src="media/photos/${id}-${m.widths.at(-1)}.webp" srcset="${set('webp')}" sizes="${sizes}" width="${m.width}" height="${m.height}" alt="${ALT[id]}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
};
const mark = (cls = '') => `<svg class="mark ${cls}" viewBox="0 0 64 24" aria-hidden="true"><use href="#mark"/></svg>`;
const rule = () => `<div class="rule" aria-hidden="true"><i></i>${mark()}<i></i></div>`;
const draft = '<sup class="dr">черновик</sup>';
const tel = `tel:${cfg.contacts.phoneTel}`;
const NAME = '<span lang="tr">Tamer Örcü</span>';

// три варианта большой идеи — см. COPY_REVIEW.md
const IDEA = {
  A: 'Найти мастера, которому хватает двух слов. За креслом я с 12 лет.',
  B: 'Выйти из кресла тем, кем себя считаешь. Турецкая школа, больше 30 лет практики.',
  C: 'Носить свою форму каждый день. Подбираю её под лицо, волос и образ жизни.',
};
const STATS = [
  ['30+', 'лет в профессии'],
  ['18', 'лет работаю в России'],
  ['12', 'лет мне было на старте'],
];
const stats = () => `<dl class="stats">${STATS.map(([n, l]) => `<div class="stat"><dd>${n}</dd><dt>${l}</dt></div>`).join('')}</dl>`;
const locs = '<p class="locs">3 локации в Москве: <span class="todo">метро [TODO]</span></p>';
const cta = (main = 'Записаться') =>
  `<div class="cta"><a class="btn" href="#" data-noop>${main}</a><a class="call" href="${tel}">Позвонить</a></div>`;

const SERVICES = [
  ['Мужская стрижка', 'Носить форму, подобранную под лицо, волос и образ жизни'],
  ['Fade: ножницы и машинка', 'Показать чистый переход с любого ракурса'],
  ['Борода', 'Собрать лицо одной линией бороды'],
  ['Турецкое бритьё', 'Дать лицу отдых под пеной и опасной бритвой'],
  ['Камуфляж седины', 'Приглушить седину и остаться собой'],
];
const services = (extra = '') => `
  <section class="scr services">
    <header class="sh rv"><p class="lead"><span lang="tr">Hizmetler</span> · услуги</p><h3 class="big">С чем вы выйдете из кресла</h3></header>
    ${extra}
    <ol class="svcs">${SERVICES.map(
      ([t, v], i) => `
      <li class="svc rv"><span class="svc-n">${String(i + 1).padStart(2, '0')}</span>
        <div class="svc-b"><h4>${t}</h4><p>${v}</p></div>
        <div class="svc-m"><span class="todo">— мин</span><b class="todo">— ₽</b></div>
        <a class="svc-go" href="#" data-noop aria-label="Записаться: ${t}">Записаться</a></li>`,
    ).join('')}</ol>
    <p class="svc-note">Список услуг собран из резюме и ждёт подтверждения. Цена и длительность появятся из facts.md.</p>
  </section>`;
const manifest = (inner = '') => `
  <section class="scr manifest">
    ${inner}
    <p class="lead rv">манифест</p>
    <p class="shout rv">Строка Тамера <span class="todo">[TODO]</span></p>
    <p class="tr rv">ниже мелко встанет русский перевод · фраза из его Telegram, ждёт согласия</p>
  </section>`;
const mq = (text, cls = '') => {
  const run = `<span>${Array(8).fill(text).join(' ')}&nbsp;</span>`;
  return `<div class="mq ${cls}" aria-hidden="true"><div class="mq-t">${run}${run}</div></div>`;
};

/* ---------- пять вариантов ---------- */
const variants = [
  {
    id: 'v1',
    name: 'Журнал',
    idea: 'Обложка мужского журнала: портрет, огромное имя с засечками, много воздуха.',
    axes: 'светлый · антиква · ведёт фото · спокойный',
    html: `
  <section class="scr hero">
    <p class="mast"><span>турецкий барбер</span>${mark()}<span>Москва</span></p>
    <h3 class="name rv">${NAME}</h3>
    <div class="cover">
      <div class="side">
        <p class="tag rv">${IDEA.A}${draft}</p>
        ${stats()}
      </div>
      <div class="port" data-par="0.06">${pic('hero-cutout', '(min-width:900px) 34vw, 62vw', '', true)}</div>
    </div>
    <div class="foot">${locs}${cta()}</div>
  </section>
  ${manifest(`<div class="m-photo" data-par="0.08">${pic('p15', '(min-width:900px) 24vw, 44vw')}</div>${rule()}`)}
  ${services(`<div class="s-photo rv">${pic('p08', '(min-width:900px) 30vw, 90vw')}</div>`)}`,
  },
  {
    id: 'v2',
    name: 'Ночь',
    idea: 'Кино: огонь в руке на весь экран, интерфейс почти исчезает.',
    axes: 'тёмный · тонкий гротеск · ведёт видео · спокойный',
    html: `
  <section class="scr hero">
    <video class="bgv" muted loop playsinline preload="metadata" poster="media/video/fire-1-poster.webp" aria-hidden="true" tabindex="-1">
      <source src="media/video/fire-1.webm" type="video/webm"><source src="media/video/fire-1.mp4" type="video/mp4">
    </video>
    <i class="shade"></i>
    <p class="mast">${mark()}<span>Москва</span></p>
    <div class="low">
      <p class="lead rv">турецкий барбер</p>
      <h3 class="name rv">${NAME}</h3>
      <p class="tag rv">${IDEA.B}${draft}</p>
      ${cta()}
      ${stats()}
      ${locs}
    </div>
  </section>
  ${manifest(`<div class="m-photo" data-par="0.05">${pic('p13', '100vw')}</div><i class="shade"></i>`)}
  ${services()}`,
  },
  {
    id: 'v3',
    name: 'Стамбул сегодня',
    idea: 'Кремовый лист, один коралловый цвет из изникской керамики и круги: зеркало, очки, арка.',
    axes: 'светлый · геометрический гротеск · ведёт графика · спокойный',
    html: `
  <section class="scr hero">
    <i class="disc" data-par="0.1"></i><i class="ring"></i>
    <p class="mast"><span>турецкий барбер</span><span>Москва</span></p>
    <h3 class="name rv">${NAME}</h3>
    <div class="arch-row">
      <div class="arch rv">${pic('p01', '(min-width:900px) 30vw, 60vw', '', true)}</div>
      <div class="side">
        <p class="hello rv"><span lang="tr">Hoş geldin</span><small>добро пожаловать</small></p>
        ${mark('big')}
      </div>
    </div>
    <p class="tag rv">${IDEA.C}${draft}</p>
    ${stats()}
    <div class="foot">${locs}${cta()}</div>
  </section>
  ${manifest('<i class="ring r1" data-par="0.12"></i><i class="ring r2" data-par="-0.08"></i><i class="half"></i>')}
  ${services()}`,
  },
  {
    id: 'v4',
    name: 'Улица',
    idea: 'Цвет полотенца с его фото во весь экран, рисунок от руки, голос погромче.',
    axes: 'цветной · рукописный и плакатный · ведёт рисунок · подвижный',
    html: `
  <section class="scr hero">
    ${mq('<span lang="tr">TÜRK BERBERİ</span> · ТУРЕЦКИЙ БАРБЕР · МОСКВА ·')}
    <h3 class="name rv">${NAME}</h3>
    <div class="stage">
      <svg class="blob" viewBox="0 0 400 420" aria-hidden="true"><path d="M58 96c38-62 150-92 238-58 76 30 104 112 86 196-16 78-62 150-150 168-96 20-190-22-214-112-18-68 4-140 40-194z"/></svg>
      <div class="port" data-par="0.07">${pic('hero-cutout', '(min-width:900px) 30vw, 70vw', '', true)}</div>
      <p class="note n1 rv">30+ лет<br>в профессии<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 6c14 2 30 10 44 26M48 32l-2-12M48 32l-12-2"/></svg></p>
      <p class="note n2 rv">18 лет<br>в России</p>
      <p class="note n3 rv">начал<br>в 12 лет</p>
    </div>
    <p class="tag rv">${IDEA.A}${draft}</p>
    <div class="foot">${locs}${cta()}</div>
  </section>
  ${manifest('<svg class="scrib" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true"><path d="M4 18c40-12 70 10 110-2s70-10 100 0 50 6 82-4"/></svg>')}
  ${services()}`,
  },
  {
    id: 'v5',
    name: 'Афиша',
    idea: 'Имя во всю ширину, три бегущие строки, чёрно-белое фото и один кислотный цвет.',
    axes: 'чёрный · узкий плакатный гротеск · ведёт типографика · максимум движения',
    html: `
  <section class="scr hero">
    ${mq('БАРБЕР · <span lang="tr">BERBER</span> · МОСКВА ·', 'a')}
    <h3 class="name rv">${NAME}</h3>
    <div class="strip" data-par="0.05">${pic('p16', '100vw', '', true)}</div>
    ${mq('30+ ЛЕТ В ПРОФЕССИИ · 18 ЛЕТ В РОССИИ · ЗА КРЕСЛОМ С 12 ЛЕТ ·', 'b rev')}
    <p class="tag rv">${IDEA.B}${draft}</p>
    ${stats()}
    <div class="foot">${locs}${cta('Записаться →')}</div>
  </section>
  ${manifest(`${mq('<span lang="tr">SIHHATLER OLSUN</span> · НА ЗДОРОВЬЕ ·', 'top')}${mq('<span lang="tr">SIHHATLER OLSUN</span> · НА ЗДОРОВЬЕ ·', 'bot rev')}`)}
  ${services(mq('УСЛУГИ · <span lang="tr">HİZMETLER</span> ·', 'a'))}`,
  },
];

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Tamer Örcü: пять вариантов дизайна</title>
<link rel="preload" href="fonts/inter-tight-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="preview.css">
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="mark" viewBox="0 0 64 24"><circle cx="17" cy="13" r="9.5"/><circle cx="47" cy="13" r="9.5"/><path d="M26.500 11q5.500-5 11 0M7.500 11 1 8.500M56.500 11 63 8.500"/></symbol></svg>
<header class="pv-top">
  <p class="pv-kicker">Предпросмотр · этап 1</p>
  <h1><span lang="tr">Tamer Örcü</span>: пять вариантов дизайна</h1>
  <p>В каждом варианте три экрана: первый, кадр-манифест и услуги. Выбор может быть сборным: шрифт из одного, цвет из другого.</p>
  <p class="pv-note">Строки с пометкой «черновик» и список услуг ждут утверждения. Цены, длительность, метро и фраза манифеста появятся позже, сейчас на их месте [TODO].</p>
  <nav aria-label="Варианты">${variants.map((v, i) => `<a href="#${v.id}">${i + 1}. ${v.name}</a>`).join('')}</nav>
</header>
<main>
${variants
  .map(
    (v, i) => `<article class="variant" id="${v.id}">
  <header class="pv-head"><span class="pv-n">0${i + 1}</span><div><h2>${v.name}</h2><p>${v.idea}</p><p class="pv-axes">${v.axes}</p></div></header>
  <div class="v ${v.id}">${v.html}</div>
</article>`,
  )
  .join('\n')}
</main>
<footer class="pv-foot"><p lang="tr">Sıhhatler olsun</p><small>на здоровье, так в Турции говорят после стрижки</small></footer>
<script src="preview.js" defer></script>
</body>
</html>
`;
writeFileSync(`${OUT}/index.html`, html);
console.log(`preview/index.html: ${(html.length / 1024).toFixed(1)} КБ, шрифтов ${readdirSync(`${OUT}/fonts`).length}`);
