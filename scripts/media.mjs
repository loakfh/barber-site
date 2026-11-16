// Готовит медиа для сайта из content/*/raw.
//   npm run media            — всё
//   npm run media -- photos  — только фото
//   npm run media -- video   — только видео
// Фото: AVIF и WebP в нескольких ширинах + content/media.json с размерами для srcset.
// Видео: mp4 (H.264) и webm (VP9) без звука + постер-кадр. Нужен ffmpeg.
// Исходники не меняются. EXIF (в том числе геометки телефона) в результат не попадает.
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const only = process.argv[2];
const OUT = 'public/media';
const MANIFEST = 'content/media.json';
const WIDTHS = [480, 800, 1200, 1600];
const manifest = { photos: {}, video: {} };
// имя файла → латиница без пробелов: кириллица в путях ломается на части хостингов
const RU = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const LAT = ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','c','ch','sh','sch','','y','','e','yu','ya'];
const slug = (file) =>
  [...basename(file, extname(file)).normalize('NFC').toLowerCase()]
    .map((ch) => (RU.includes(ch) ? LAT[RU.indexOf(ch)] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'file';
const taken = new Map();
// два разных исходника не должны молча перезаписать друг друга
const claim = (id, src) => {
  if (taken.has(id) && taken.get(id) !== src) throw new Error(`Одинаковое имя после транслитерации: «${taken.get(id)}» и «${src}» → ${id}. Переименуйте один из файлов.`);
  taken.set(id, src);
  return id;
};
// В public/ (и в репозиторий) идут только файлы из списка content/media-use.json:
// остальные исходники наружу не выкладываем.
const USE = JSON.parse(readFileSync('content/media-use.json', 'utf8'));
const list = (dir, re) => (existsSync(dir) ? readdirSync(dir).filter((f) => re.test(f) && [...USE.photos, ...USE.video].includes(slug(f))).sort() : []);

async function photo(src, id, { alpha = false } = {}) {
  const img = sharp(src).rotate(); // поворот по EXIF, затем EXIF отбрасывается
  const meta = await img.metadata();
  const turned = (meta.orientation ?? 1) >= 5;
  const [w, h] = turned ? [meta.height, meta.width] : [meta.width, meta.height];
  const widths = WIDTHS.filter((x) => x <= w);
  if (!widths.length) widths.push(w);
  mkdirSync(join(OUT, 'photos'), { recursive: true });
  for (const width of widths) {
    const base = join(OUT, 'photos', `${id}-${width}`);
    const pipe = sharp(src).rotate().resize({ width });
    await pipe.clone().avif({ quality: alpha ? 60 : 52, effort: 6 }).toFile(`${base}.avif`);
    await pipe.clone().webp({ quality: alpha ? 82 : 76, alphaQuality: 90 }).toFile(`${base}.webp`);
  }
  manifest.photos[id] = { src: basename(src), width: w, height: h, widths,  };
  console.log(`фото  ${id}: ${w}×${h} → ${widths.join(', ')}`);
}

async function video(src, id) {
  mkdirSync(join(OUT, 'video'), { recursive: true });
  const base = join(OUT, 'video', id);
  const probe = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:stream_side_data=rotation:format=duration', '-of', 'json', src]).toString(),
  );
  const s = probe.streams[0];
  const rot = Math.abs(Number(s.side_data_list?.[0]?.rotation ?? 0)) % 180 === 90;
  const [w, h] = rot ? [s.height, s.width] : [s.width, s.height];
  // короткая сторона до 720px, чётные размеры; ffmpeg сам применяет поворот из метаданных
  const scale = w < h ? "scale='min(720,iw)':-2" : "scale=-2:'min(720,ih)'";
  const run = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  run(['-an', '-vf', scale, '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  run(['-an', '-vf', scale, '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', `${base}.webm`]);
  // постер: кадр через PNG в sharp — в сборках ffmpeg из Homebrew нет кодировщика WebP
  const frame = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(Math.min(1, Number(probe.format.duration) / 2)), '-i', src, '-frames:v', '1', '-vf', scale, '-f', 'image2pipe', '-c:v', 'png', '-'], { maxBuffer: 64 * 1024 * 1024 });
  await sharp(frame).webp({ quality: 78 }).toFile(`${base}-poster.webp`);
  await sharp(frame).avif({ quality: 52 }).toFile(`${base}-poster.avif`);
  const out = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', `${base}.mp4`]).toString()).streams[0];
  manifest.video[id] = { src: basename(src), width: out.width, height: out.height, duration: Math.round(Number(probe.format.duration) * 10) / 10 };
  console.log(`видео ${id}: ${out.width}×${out.height}, ${manifest.video[id].duration} с`);
}

if (only !== 'video') {
  for (const f of list('content/photos/raw', /\.(jpe?g|png|heic|heif|webp|tiff?)$/i)) await photo(join('content/photos/raw', f), claim(slug(f), f));
  if (existsSync('content/photos/hero-cutout.png')) await photo('content/photos/hero-cutout.png', 'hero-cutout', { alpha: true });
}
if (only !== 'photos') {
  for (const f of list('content/video/raw', /\.(mp4|mov|m4v|webm)$/i)) await video(join('content/video/raw', f), claim(slug(f), f));
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`готово: ${Object.keys(manifest.photos).length} фото, ${Object.keys(manifest.video).length} видео → ${MANIFEST}`);
