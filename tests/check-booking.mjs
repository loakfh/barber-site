// Проверка панели записи на тестовых локациях (сборка FIXTURE=1 в dist-test).
// Запуск: npm run check
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = 'dist-test';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = createServer((req, res) => {
  // /prod/… отдаёт боевую сборку, остальное — тестовую
  const path = decodeURIComponent(req.url.split('?')[0]);
  let p = path.startsWith('/prod/') ? join('dist', path.slice(5)) : join(ROOT, path);
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
}).listen(4175);

let failed = 0;
const ok = (cond, name, extra = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'ок  ' : 'FAIL'} ${name}${cond ? '' : ' → ' + extra}`);
};
mkdirSync('work/site', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/New_York', permissions: ['clipboard-read', 'clipboard-write'] });
await ctx.addInitScript(() => sessionStorage.setItem('intro', '1'));
// маршруты наружу глушим: проверяем только собранные ссылки
await ctx.route(/t\.me|wa\.me|max\.ru|yandex/, (r) => r.abort());
const p = await ctx.newPage();
await p.goto('http://localhost:4175/');

// 1. услуга из списка подставляется
ok(await p.locator('#bar').evaluate((el) => el.classList.contains('hide')), 'на первом экране нижняя панель скрыта: кнопка «Записаться» одна');
await p.locator('.hero [data-book]').click();
await p.locator('.opt[data-kind="service"]', { hasText: 'Борода' }).click();
ok((await p.locator('#bkSum').textContent()).includes('Борода'), 'услуга выбирается в панели');
ok((await p.locator('.send.off').count()) === 3, 'без места, дня и времени отправка выключена');

// 2. место → день → время
await p.locator('.opt[data-kind="location"]').nth(1).click();
const days = await p.locator('.opt[data-kind="day"]').allTextContents();
ok(days.length > 0 && days.every((d) => /^(вт|чт|сегодня|завтра), /.test(d)), 'дни только из графика локации (вт и чт)', days.join(' | '));
await p.locator('.opt[data-kind="day"]').last().click();
const times = await p.locator('.opt[data-kind="time"]').allTextContents();
ok(times[0] === '11:00' && times.at(-1) === '19:00' && times.length === 17, 'время с шагом 30 минут в часы приёма', `${times[0]}…${times.at(-1)} (${times.length})`);
await p.locator('.opt[data-kind="time"]', { hasText: '12:30' }).click();
await p.screenshot({ path: 'work/site/m-booking.png' });

// 3. текст и ссылки
const dayFull = await p.evaluate(() => document.querySelector('.opt[data-kind="day"].on').dataset.value);
const hrefs = Object.fromEntries(await p.locator('a.send').evaluateAll((els) => els.map((a) => [a.dataset.m, a.href])));
const text = decodeURIComponent(hrefs.telegram.split('?text=')[1]);
console.log('     сообщение:', text);
ok(/^Здравствуйте, Тамер! Хочу записаться: Борода, (понедельник|вторник|среда|четверг|пятница|суббота|воскресенье), \d{1,2} [а-я]+, 12:30, ТЕСТ Коворкинг 2, м\. Тестовая-2\.$/.test(text), 'текст сообщения по шаблону');
ok(hrefs.telegram === `https://t.me/tamerorcu?text=${encodeURIComponent(text)}`, 'ссылка Telegram', hrefs.telegram);
ok(hrefs.whatsapp === `https://wa.me/79270376767?text=${encodeURIComponent(text)}`, 'ссылка WhatsApp', hrefs.whatsapp);
ok(hrefs.max === 'https://max.ru/u/test-profile', 'ссылка MAX ведёт на профиль без текста', hrefs.max);
ok(new Date(dayFull + 'T00:00:00Z').getUTCDay() === 4 || new Date(dayFull + 'T00:00:00Z').getUTCDay() === 2, 'выбранная дата приходится на вт или чт', dayFull);

// 4. буфер и память о мессенджере
await p.locator('a.send[data-m="max"]').evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
await p.locator('a.send[data-m="max"]').click();
await p.waitForTimeout(300);
ok((await p.evaluate(() => navigator.clipboard.readText())) === text, 'сообщение скопировано в буфер');
ok((await p.locator('#toast').textContent()) === 'Сообщение скопировано, вставьте его в чат', 'подсказка для MAX');
ok((await p.evaluate(() => localStorage.getItem('messenger'))) === 'max', 'последний мессенджер запомнен');

// 5. «Записаться сюда» из карточки локации
await p.locator('#booking .x').click();
await p.locator('.loc [data-location="t3"]').click();
ok((await p.locator('#bkSum').textContent()).includes('Тестовая-3'), 'локация из карточки подставилась');
ok((await p.locator('.send').first().textContent()) === 'MAX', 'запомненный мессенджер стоит первым');
await p.locator('#booking .x').click();

// 7. нижняя панель не перекрывает последний блок
await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(400);
const gap = await p.evaluate(() => document.querySelector('.fin-tr').getBoundingClientRect().bottom <= document.querySelector('.bar').getBoundingClientRect().top);
await p.evaluate(() => document.querySelector('.ct-go .btn').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(500);
ok(await p.locator('#bar').evaluate((el) => el.classList.contains('hide')), 'у контактов нижняя панель скрыта: кнопка «Записаться» одна');
await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(500);
ok(gap, 'нижняя панель не перекрывает финал');
await p.locator('[data-route]').click();
ok((await p.locator('#routes a').count()) === 6, 'выбор маршрута: три локации, по две ссылки');
await p.screenshot({ path: 'work/site/m-routes.png' });

// 7a. боевая сборка: три адреса без графика, достаточно выбрать место
const q = await ctx.newPage();
await q.goto('http://localhost:4175/prod/');
ok((await q.locator('.loc').count()) === 3, 'на боевой странице три адреса');
ok((await q.locator('.tile').count()) >= 17 && (await q.locator('.chip').count()) === 0, 'работы одной смешанной сеткой, без переключателя');
ok((await q.locator('a[href*="instagram"]').count()) === 0, 'ссылок на Instagram нет');
await q.locator('.loc [data-book]').first().click();
const prodText = decodeURIComponent((await q.locator('a.send[data-m="telegram"]').getAttribute('href')).split('?text=')[1]);
console.log('     сообщение:', prodText);
ok(prodText === 'Здравствуйте, Тамер! Хочу записаться: «Друзья и встречи», м. Сухаревская.', 'место и метро из карточки попадают в сообщение, время не требуется', prodText);
ok((await q.locator('a.send').count()) === 3 && (await q.locator('.ct-max a').count()) === 1, 'MAX есть в панели записи и в контактах');
ok((await q.locator('.loc-metro i').count()) === 4, 'у адресов метро с цветом ветки');
await q.goto('http://localhost:4175/prod/tr/');
ok((await q.locator('html').getAttribute('lang')) === 'tr' && (await q.locator('.lang a[aria-current]').textContent()) === 'TR', 'турецкая версия открывается, переключатель показывает TR');
await q.locator('.hero [data-book]').click();
await q.locator('.opt[data-kind="location"]').nth(1).click();
const trText = decodeURIComponent((await q.locator('a.send[data-m="whatsapp"]').getAttribute('href')).split('?text=')[1]);
console.log('     сообщение:', trText);
ok(trText.startsWith('Merhaba Tamer! Randevu almak istiyorum: ') && trText.includes('Belyayevo'), 'турецкое сообщение собирается', trText);
const cyr = await q.evaluate(() => [...document.querySelectorAll('main h2, main h3, .nav a, .btn, .bar *')].map((e) => e.textContent).filter((x) => /[а-яё]/i.test(x) && !x.includes('«')));
ok(cyr.length === 0, 'в турецкой версии заголовки и кнопки без русского текста', cyr.join(' | '));
await q.close();

// 8. запрещённые слова и тестовые данные в боевой сборке
const prod = readFileSync('dist/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
const banned = ['быстро', 'качественн', 'недорог', 'профессионально', 'индивидуальный подход', 'свободные слоты', 'вы записаны', 'премиальн'];
const hit = banned.filter((w) => prod.toLowerCase().includes(w));
ok(hit.length === 0, 'в боевой сборке нет запрещённых слов', hit.join(', '));
ok(!readFileSync('dist/index.html', 'utf8').includes('ТЕСТ'), 'в боевой сборке нет тестовых данных');

await b.close();
server.close();
console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе проверки пройдены');
process.exit(failed ? 1 : 0);
