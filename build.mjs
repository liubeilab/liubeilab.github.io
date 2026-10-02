/* Builds the static site from local content — no runtime data fetching.
   Structured content lives in data/*.json; news posts are Markdown files in
   news/. Header and footer are baked into the emitted HTML so crawlers see real
   markup and each route keeps its own URL. Run: node build.mjs
   Requires Node 18+. No dependencies. */

import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const readJSON = (f) => JSON.parse(readFileSync(join(OUT, f), 'utf8'));

/* ---------------- content ---------------- */

const publications = readJSON('data/publications.json').sort((a, b) => b.idx - a.idx);
const team         = readJSON('data/team.json').sort((a, b) => a.sortOrder - b.sortOrder);
const alumni       = readJSON('data/alumni.json').sort((a, b) => a.sortOrder - b.sortOrder);
const resources    = readJSON('data/resources.json').sort((a, b) => a.sortOrder - b.sortOrder);

/* News: one Markdown file per post, `<name>.md`, with YAML-ish front matter. */
function parseFrontMatter(raw) {
  // Normalise BOM and CRLF/CR so the front-matter fences match regardless of
  // how the file was saved (Windows/git autocrlf produce \r\n).
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  raw = raw.replace(/\r\n?/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (/^".*"$/.test(val)) { try { val = JSON.parse(val); } catch { val = val.slice(1, -1); } }
    meta[key] = val;
  }
  return { meta, body: m[2] };
}

const posts = readdirSync(join(OUT, 'news'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { meta, body } = parseFrontMatter(readFileSync(join(OUT, 'news', f), 'utf8'));
    return { slug: f.replace(/\.md$/, ''), title: meta.title || '', date: meta.date || '',
             excerpt: meta.excerpt || '', cover: meta.cover || '', coverAlt: meta.coverAlt || '',
             body: body.trim() };
  })
  // Newest first; for posts sharing a date, break the tie by slug (descending)
  // so the order is deterministic instead of readdir-dependent.
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.slug.localeCompare(a.slug)));

/* ---------------- helpers ---------------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatDate = (d) => {
  const dt = new Date(d);
  return Number.isNaN(+dt) ? String(d)
    : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* A small Markdown renderer — enough for lab news: paragraphs, headings, lists,
   blockquotes, rules, images (single and galleries), links, bold, italic, code.
   Text is HTML-escaped first, so post content cannot inject markup. */
const IMG = /^!\[([^\]]*)\]\(([^)]+)\)$/;
function inline(s) {
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, u) => `<img src="${u}" alt="${a}" loading="lazy" />`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}
function markdown(src, { skipImage = '', dropImages = false } = {}) {
  const blocks = src.trim().split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const imgs = lines.every((l) => IMG.test(l.trim())) ? lines.map((l) => l.trim().match(IMG)) : null;
    if (imgs) {
      const kept = dropImages ? [] : imgs.filter((m) => m[2] !== skipImage);
      if (!kept.length) continue;
      const figs = kept.map(([, alt, src]) =>
        `<figure class="post-fig"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" /></figure>`).join('');
      out.push(kept.length > 1 ? `<div class="post-gallery">${figs}</div>` : figs);
    } else if (/^#{1,6}\s/.test(block)) {
      const level = block.match(/^#+/)[0].length;
      out.push(`<h${Math.min(level + 1, 4)}>${inline(block.replace(/^#+\s/, ''))}</h${Math.min(level + 1, 4)}>`);
    } else if (lines.every((l) => /^[-*]\s/.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`).join('')}</ul>`);
    } else if (lines.every((l) => /^\d+\.\s/.test(l))) {
      out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`);
    } else if (lines.every((l) => /^>\s?/.test(l))) {
      out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</blockquote>`);
    } else if (/^([-*_])\1{2,}$/.test(block)) {
      out.push('<hr />');
    } else {
      out.push(`<p>${inline(block.replace(/\n/g, '<br />'))}</p>`);
    }
  }
  return out.join('\n');
}

/* ---------------- shell ---------------- */

const NAV = [
  ['/',              'Home',         'home'],
  ['/research/',     'Research',     'research'],
  ['/publications/', 'Publications', 'pubs'],
  ['/people/',       'People',       'people'],
  ['/news/',         'News',         'news'],
  ['/open-science/', 'Open Science', 'open'],
  ['/join-us/',      'Join Us',      'join'],
];

/* Link previews (WeChat, Slack, email …): every page shares the branded card
   (assets/img/share-card.jpg, 1200×630) unless it passes its own `image`. */
const SHARE_CARD = '/assets/img/share-card.jpg';
const ORG_JSONLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ResearchOrganization',
  name: 'Liu Lab',
  url: 'https://www.liubeilab.com/',
  logo: 'https://www.liubeilab.com/assets/img/logo.png',
  email: 'beiliu@pku.edu.cn',
  parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Peking University' },
  sameAs: ['https://github.com/liubeilab'],
});

const shell = ({ key, path, title, desc, body, heroCss = '', image = SHARE_CARD }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="https://www.liubeilab.com${path}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Liu Lab" />
<meta property="og:url" content="https://www.liubeilab.com${path}" />
<meta property="og:image" content="https://www.liubeilab.com${esc(image)}" />${image === SHARE_CARD ? `
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://www.liubeilab.com${esc(image)}" />${key === 'home' ? `
<script type="application/ld+json">${ORG_JSONLD}</script>` : ''}
<link rel="icon" href="/assets/img/mark.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600&family=Spectral:ital,wght@0,300;0,400;0,600;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/styles.css" />${heroCss ? `\n<style>${heroCss}</style>` : ''}
</head>
<body>

<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <a class="brand" href="/" aria-label="Liu Lab home">
    <img src="/assets/img/logo.png" alt="Liu Lab" />
  </a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav">Menu</button>
  <nav class="nav" id="primary-nav" aria-label="Primary">
${NAV.map(([href, label, k]) => `    <a href="${href}"${k === key ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
  </nav>
</header>

<main id="main">
${body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div>
      <b>Liu Lab</b>
      <p class="meta" style="margin-top:10px">National Biomedical Imaging Center<br />College of Future Technology<br />Peking University</p>
      <p class="meta" style="margin-top:10px"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a> · <a href="https://github.com/liubeilab" target="_blank" rel="noopener">GitHub</a></p>
    </div>
    <div class="affil" style="border-top:0;margin-top:0;padding-top:0">
      <img class="affil__mark affil__mark--invert" src="/assets/img/pku.png" alt="Peking University" />
      <img class="affil__mark affil__mark--invert" src="/assets/img/cft.png" alt="College of Future Technology, Peking University" />
      <img class="affil__mark" src="/assets/img/nbic.png" alt="National Biomedical Imaging Center" />
    </div>
  </div>
</footer>

<script src="/assets/nav.js"></script>
<script src="/assets/timeline.js"></script>
<script src="/assets/lightbox.js"></script>
<script src="/assets/people.js"></script>
<!-- Cloudflare Web Analytics (privacy-friendly, no cookies) -->
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "f6f9efe816f1451490ace5de63fc749a"}'></script>
</body>
</html>
`;

/* ---------------- reusable fragments ---------------- */

const pubEntry = (p) => `
  <article class="pub"${p.featured ? ' data-featured' : ''}>
    <div class="pub__n">${esc(p.idx)}</div>
    <div>
      <h3 class="pub__title">${esc(p.title)}</h3>
      <p class="pub__authors">${esc(p.authors)}</p>
      <p class="pub__journal">${esc(p.journal)}</p>
      ${p.doi ? `<a class="pub__doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">${esc(p.doi)}</a>` : ''}
    </div>
  </article>`;

/* One event on the news timeline. Everything lives here — every photo and the
   full text — so there is nothing to click through to. Reveal + progress-line
   motion are handled by assets/timeline.js; without it the items simply show as
   a static list. */
const timelineItem = (p) => {
  /* Photo descriptions (alt text): `coverAlt:` in front matter or the text in
     ![this](…); otherwise the post title, numbered when there are several. */
  const photos = new Map();
  if (p.cover) photos.set(p.cover, p.coverAlt);
  for (const [, alt, src] of p.body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g))
    if (!photos.has(src.trim())) photos.set(src.trim(), alt.trim());
  const gallery = [...photos].map(([src, alt], i, all) =>
    ({ src, alt: alt || (all.length > 1 ? `${p.title}, photo ${i + 1} of ${all.length}` : p.title) }));
  const text = markdown(p.body, { dropImages: true });
  /* One photo: shown whole. Several: an overlapping stack you fan through on
     hover (pointing at one brings it forward). Falls back to a plain column on
     touch/narrow screens. */
  const media = gallery.length > 1
    ? `<div class="tl-media tl-media--stack"><div class="photo-stack" data-count="${gallery.length}">${gallery.map((g) => `<figure class="photo-stack__item"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></figure>`).join('')}</div></div>`
    : gallery.length === 1
      ? `<div class="tl-media"><img src="${esc(gallery[0].src)}" alt="${esc(gallery[0].alt)}" loading="lazy" /></div>`
      : '';
  return `
  <li class="tl-item">
    <span class="tl-dot" aria-hidden="true"></span>
    <div class="tl-card">
      ${media}
      <div class="tl-content">
        <span class="tl-date">${esc(formatDate(p.date))}</span>
        <h2 class="tl-title">${esc(p.title)}</h2>
        ${text ? `<div class="tl-text">${text}</div>` : ''}
      </div>
    </div>
  </li>`;
};

/* ---------------- pages ---------------- */

/* Page wording lives in pages/<name>.html — front matter (title, description,
   optional heroCss) plus the page body as HTML. {{slot}} markers in a page are
   filled with the generated content defined here; an unknown slot stops the
   build. Edit text in pages/, not here. */
const PAGES = [
  // [pages/ file, nav key, URL path, output file]
  ['home',         'home',     '/',              'index.html'],
  ['research',     'research', '/research/',     'research/index.html'],
  ['open-science', 'open',     '/open-science/', 'open-science/index.html'],
  ['publications', 'pubs',     '/publications/', 'publications/index.html'],
  ['people',       'people',   '/people/',       'people/index.html'],
  ['join-us',      'join',     '/join-us/',      'join-us/index.html'],
  ['news',         'news',     '/news/',         'news/index.html'],
];

const latestPub = publications.find((p) => p.featured) || publications[0];
const latestPost = posts[0];

const resourceGroups = (() => {
  const groups = {};
  for (const r of resources) (groups[r.category] ||= []).push(r);
  return groups;
})();

const pubYears = publications.map((p) => Number(p.year)).filter(Boolean);
const pubGroups = [];
for (const p of publications) {
  const last = pubGroups[pubGroups.length - 1];
  if (last && last.year === p.year) last.items.push(p);
  else pubGroups.push({ year: p.year, items: [p] });
}

const pi = team[0];
const members = team.slice(1);

const slots = {
  /* Home: latest featured paper and newest news post */
  latestPaper: latestPub ? `<h3 class="pub__title" style="font-size:1.34rem">${esc(latestPub.title)}</h3>
        <p class="pub__authors" style="margin-top:8px">${esc(latestPub.authors)}</p>
        <p class="pub__journal">${esc(latestPub.journal)}</p>
        ${latestPub.doi ? `<a class="pub__doi" href="https://doi.org/${esc(latestPub.doi)}" target="_blank" rel="noopener">${esc(latestPub.doi)}</a>` : ''}` : '',
  latestNews: latestPost ? `<p class="meta">${esc(formatDate(latestPost.date))}</p>
        <h3 class="pub__title" style="font-size:1.34rem;margin-top:8px">${esc(latestPost.title)}</h3>
        ${latestPost.excerpt ? `<p class="body" style="margin-top:8px">${esc(latestPost.excerpt)}</p>` : ''}
        <a class="pub__doi" href="/news/">See the timeline</a>` : '',

  /* Open Science: resources grouped by category */
  resourceCols: Math.min(Object.keys(resourceGroups).length, 4),
  resources: Object.entries(resourceGroups).map(([cat, rows]) => `<article class="tile">
          <h3 class="h-card">${esc(cat)}</h3>
          <div class="res-group">${rows.map((r) => `<div class="res"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span>${esc(r.note)}</span></div>`).join('')}</div>
        </article>`).join(''),

  /* Publications: grouped by year */
  pubCount: publications.length,
  pubFirstYear: Math.min(...pubYears),
  pubLastYear: Math.max(...pubYears),
  publications: pubGroups.map((g) => `
        <section class="pub-year">
          <h2 class="pub-year__label">${esc(g.year)}</h2>
          ${g.items.map(pubEntry).join('')}
        </section>`).join(''),

  /* People: PI block, member cards (shuffled client-side), alumni */
  pi: `<div class="pi">
        <img src="${esc(pi.photo)}" alt="${esc(pi.nameEn)}" />
        <div class="pi__body">
          <p class="pi__zh">${esc(pi.nameZh)}</p>
          <h2 class="h-section" style="font-size:clamp(1.9rem,3.2vw,2.6rem)">${esc(pi.nameEn)}, Ph.D.</h2>
          <p class="meta">${esc(pi.role)}</p>
          <p class="body">${esc(pi.bio)}</p>
          <p class="meta"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a></p>
        </div>
      </div>`,
  members: members.map((m) => `
        <article class="person">
          <img src="${esc(m.photo)}" alt="${esc(m.nameEn)}" loading="lazy" />
          <div class="person__body">
            <h3 class="person__name">${esc(m.nameZh)}</h3>
            <p class="person__en">${esc(m.nameEn)}</p>
            <p class="person__role">${esc(m.role)}</p>
            <p>${esc(m.bio)}</p>
          </div>
        </article>`).join(''),
  alumni: alumni.map((a) => `
        <article class="alumnus">
          <img src="${esc(a.photo)}" alt="${esc(a.nameEn || a.nameZh)}" loading="lazy" />
          <div><b>${esc(a.nameZh || a.nameEn)}</b><span class="meta">${esc(a.years)}</span></div>
        </article>`).join(''),

  /* News: the whole timeline */
  timeline: posts.map(timelineItem).join(''),
};

function loadPage(name) {
  const file = `pages/${name}.html`;
  const { meta, body } = parseFrontMatter(readFileSync(join(OUT, file), 'utf8'));
  if (!meta.title || !meta.description) throw new Error(`${file}: needs "title" and "description" in front matter`);
  const html = body.replace(/\s+$/, '').replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in slots)) throw new Error(`${file}: unknown slot ${m}`);
    return String(slots[k]);
  });
  return { title: meta.title, desc: meta.description, heroCss: meta.heroCss || '', body: `\n${html}` };
}

const pages = PAGES.map(([name, key, path, file]) => ({ key, path, file, ...loadPage(name) }));
// A shared News link previews the newest event's photo.
const newsPage = pages.find((p) => p.key === 'news');
if (latestPost?.cover) newsPage.image = latestPost.cover;

/* ---------------- emit ---------------- */

for (const p of pages) {
  const target = join(OUT, p.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, shell(p), 'utf8');
  console.log(`  ${p.file.padEnd(40)} ${p.path}`);
}

/* Retired URLs keep working: each gets a tiny page that forwards to its new
   home. Technologies was merged into Research on 2026-10-02. */
const REDIRECTS = [
  ['technologies/index.html', '/research/#tools'],
];
for (const [file, to] of REDIRECTS) {
  const target = join(OUT, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Moved | Liu Lab</title>
<meta http-equiv="refresh" content="0; url=${to}" />
<link rel="canonical" href="https://www.liubeilab.com${to}" />
<meta name="robots" content="noindex" />
</head>
<body><p>This page has moved to <a href="${to}">${to}</a>.</p></body>
</html>
`, 'utf8');
  console.log(`  ${file.padEnd(40)} -> ${to}`);
}

writeFileSync(join(OUT, 'CNAME'), 'www.liubeilab.com\n', 'utf8');
writeFileSync(join(OUT, '.nojekyll'), '', 'utf8');

const SITE = 'https://www.liubeilab.com';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><changefreq>${p.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p.path === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), sitemap, 'utf8');

writeFileSync(join(OUT, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`, 'utf8');

writeFileSync(join(OUT, '404.html'), shell({ key: '', path: '/404.html', ...loadPage('404') }), 'utf8');

console.log(`\n${pages.length} pages (incl. ${posts.length} news posts) + 404, sitemap.xml, robots.txt, .nojekyll written.`);
console.log('CNAME: www.liubeilab.com');
