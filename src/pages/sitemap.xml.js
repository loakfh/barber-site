export const GET = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const day = new Date().toISOString().slice(0, 10);
  const urls = [base, `${base}tr/`].map((p) => `<url><loc>${new URL(p, site).href}</loc><lastmod>${day}</lastmod></url>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
