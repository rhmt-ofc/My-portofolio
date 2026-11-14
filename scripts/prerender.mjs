import fs from 'node:fs/promises';
import { applySEO } from './seo.mjs';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
try {
  const { render } = await server.ssrLoadModule('/src/entry-server.tsx');
  let page = await applySEO(await fs.readFile('dist/index.html', 'utf8')); 
  // Optimized CSS loading: keep hashed stylesheet with preload to enable browser disk-caching and cut HTML payload in half
  const stylesheet = page.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (stylesheet) {
    page = page.replace(stylesheet[0], `<link rel="preload" href="${stylesheet[1]}" as="style"><link rel="stylesheet" href="${stylesheet[1]}">`);
  }
  const html = render();
  if (!html.includes('Learning') || !html.includes('THE DIGITAL ARCHIVE')) throw new Error('Prerender content incomplete');
  const data = JSON.parse(await fs.readFile('shared/content.json', 'utf8'));
  const offlineIndex = `<noscript><style>.intro-screen{display:none!important}.opening-sequence>.hero{position:relative!important;top:auto!important}</style><section style="padding:32px;max-width:1000px;margin:auto"><h2>Indeks arsip tanpa JavaScript</h2><p>Aktifkan JavaScript untuk pencarian, dialog interaktif, chat, dan video. Seluruh karya tetap dapat dibaca di bawah ini.</p>${data.PROJECTS.map(p => `<article style="padding:20px 0;border-top:1px solid #888"><h3>${escape(p.name)}</h3><p>${escape(p.status)} · ${escape(p.category)}</p><p>${escape(p.description)}</p><p>${p.ecosystem.map(escape).join(' · ')}</p>${/^https:\/\//.test(p.url) ? `<a href="${escape(p.url)}" rel="noopener noreferrer" target="_blank">Tautan arsip ${escape(p.name)}</a>` : '<p>Demo tidak tersedia dalam sumber.</p>'}</article>`).join('')}<h2>Jejaring</h2><p>${data.PEOPLE.map(p => escape(p.name)).join(' · ')}</p><h2>Seluruh tools</h2>${data.ECOSYSTEM.map(g => `<h3>${escape(g.category)}</h3><p>${g.items.map(t => escape(t.name)).join(' · ')}</p>`).join('')}</section></noscript>`;
  await fs.writeFile('dist/index.html', page.replace('<!--app-->', html).replace(/<noscript>[\s\S]*?<\/noscript>/, offlineIndex));
  console.log(`Prerendered complete portfolio: ${(html.length / 1024).toFixed(1)} KB HTML`);
} finally { await server.close(); }
