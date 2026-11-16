// Чистые функции панели записи: время в Москве, скрытие прошедшего, статус «сейчас принимает».
import { getAvailability, isOpenNow, buildMessage, moscowNow } from '../src/scripts/booking.js';
let failed = 0;
const ok = (c, n, e = '') => { if (!c) failed++; console.log(`${c ? 'ок  ' : 'FAIL'} ${n}${c ? '' : ' → ' + e}`); };
const loc = { name: 'Т', metro: 'М', hours: { mon: ['10:00', '20:00'] } };
const booking = { daysAhead: 14, stepMinutes: 30 };
// понедельник 16.11.2026, 14:10 по Москве
const now = { y: 2026, m: 11, d: 16, minutes: 14 * 60 + 10 };
const days = getAvailability(loc, booking, now);
ok(days.length === 2, 'за 14 дней два понедельника', days.length);
ok(days[0].times[0] === '14:30' && days[0].times.at(-1) === '19:30', 'сегодня прошедшее время скрыто', days[0].times[0]);
ok(days[1].times[0] === '10:00' && days[1].times.length === 20, 'в другой день все окна открыты, занятость не имитируется', days[1].times.length);
ok(days[0].full === 'понедельник, 16 ноября' && days[1].full === 'понедельник, 23 ноября', 'день недели и дата', days[1].full);
ok(getAvailability(loc, booking, { ...now, minutes: 19 * 60 + 45 }).length === 1, 'если сегодня времени не осталось, день не показывается');
ok(isOpenNow(loc, now) && !isOpenNow(loc, { ...now, minutes: 20 * 60 }) && !isOpenNow(loc, { ...now, d: 17 }), 'статус «сейчас принимает»');
const m = moscowNow(new Date('2026-11-16T22:30:00Z'));
ok(m.d === 17 && m.minutes === 90, 'время считается по Москве, а не по телефону', JSON.stringify(m));
ok(buildMessage({}) === 'Здравствуйте, Тамер! Хочу записаться.', 'сообщение без выбора');
ok(buildMessage({ service: { title: 'Борода' } }) === 'Здравствуйте, Тамер! Хочу записаться: Борода.', 'сообщение только с услугой');
process.exit(failed ? 1 : 0);
