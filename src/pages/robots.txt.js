import { isPreview } from '../lib/config.js';
// На предпросмотре (GitHub Pages) индексация закрыта, на боевом домене открыта.
export const GET = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const body = isPreview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${new URL(`${base}sitemap.xml`, site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
