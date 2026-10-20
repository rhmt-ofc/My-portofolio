import fs from 'node:fs/promises';
import { loadEnv } from 'vite';
/** One canonical origin for HTML, social tags, structured data, robots and sitemap. */
export function canonicalOrigin(siteURL,vercelURL){
  const requested=siteURL||(vercelURL?`https://${vercelURL}`:'https://rhmt.biz.id/');
  const url=new URL(requested);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('PORTFOLIO_SITE_URL must be a clean HTTPS root URL.');
  return url.origin+'/';
}
export async function applySEO(page){
  const productionDomain = process.env.PORTFOLIO_SITE_URL || 'https://rhmt.biz.id/';
  const origin=canonicalOrigin(productionDomain, process.env.VERCEL_PROJECT_PRODUCTION_URL),old='https://rhmt.biz.id/';

  const today = new Date().toISOString().slice(0, 10);
  page = page.replaceAll(old, origin).replace(/"dateModified":"[^"]+"/, `"dateModified":"${today}"`);
  await fs.writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}sitemap.xml\n`);
  await fs.writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}</loc><lastmod>${today}</lastmod></url></urlset>\n`);
  console.log(`Canonical, sitemap and robots: ${origin}`);
  return page;
}
