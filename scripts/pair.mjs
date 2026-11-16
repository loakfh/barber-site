// Склеивает два фото в одно, бок о бок, по общей высоте.
// node scripts/pair.mjs левое.jpg правое.jpg результат.jpg
import sharp from 'sharp';
const [a, b, out] = process.argv.slice(2);
const H = 1280, GAP = 10;
const [l, r] = await Promise.all([a, b].map((f) => sharp(f).rotate().resize({ height: H }).toBuffer({ resolveWithObject: true })));
await sharp({ create: { width: l.info.width + GAP + r.info.width, height: H, channels: 3, background: '#0a0b0d' } })
  .composite([{ input: l.data, left: 0, top: 0 }, { input: r.data, left: l.info.width + GAP, top: 0 }])
  .jpeg({ quality: 92 })
  .toFile(out);
console.log(out, l.info.width + GAP + r.info.width, 'x', H);
