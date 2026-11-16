// Картинка для соцсетей и мессенджеров: кадр первого экрана 1200×630.
// Запуск: npm run build && npm run og (нужен собранный dist), затем ещё раз npm run build.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = createServer((req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }).end(readFileSync(p));
}).listen(4176);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.goto('http://localhost:4176/');
await p.evaluate(() => document.fonts.ready);
await p.addStyleTag({ content: '.dr,.cta,.mast{display:none!important}.name{font-size:170px!important}.hero{height:630px!important}' });
await p.waitForTimeout(500);
await sharp(await p.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } })).jpeg({ quality: 84 }).toFile('public/og.jpg');
await b.close();
server.close();
console.log('public/og.jpg готов');
