export const GET = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${new URL(base, site).href}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url></urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
