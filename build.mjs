/* Builds the static site from local content — no runtime data fetching.
   Structured content lives in data/*.json; news posts are Markdown files in
   news/. Header and footer are baked into the emitted HTML so crawlers see real
   markup and each route keeps its own URL. Run: node build.mjs
   Requires Node 18+. No dependencies. */

import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
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

/* Pixel size of a local JPEG/PNG, read from the file header (no dependencies).
   Every <img> gets width/height so the browser reserves its space before the
   photo arrives — otherwise the page jumps as images load. */
const sizeCache = new Map();
function imageSize(src) {
  if (sizeCache.has(src)) return sizeCache.get(src);
  let size = null;
  try {
    const b = readFileSync(join(OUT, decodeURI(src.replace(/[?#].*$/, '')).replace(/^\//, '')));
    if (b.readUInt32BE(0) === 0x89504E47) size = [b.readUInt32BE(16), b.readUInt32BE(20)];
    else if (b.readUInt16BE(0) === 0xFFD8) {
      for (let i = 2; i + 9 < b.length;) {
        if (b[i] !== 0xFF) { i++; continue; }
        const marker = b[i + 1];
        if (marker === 0xFF) { i++; continue; }
        // SOF0–SOF15 carry the frame size (C4, C8, CC are not frame headers)
        if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) {
          size = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
          break;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch { /* missing file: tools/check.mjs reports it */ }
  sizeCache.set(src, size);
  return size;
}
/* Smaller WebP copies of a photo, if tools/make-variants.py has made them
   (assets/img/r/…-480.webp, -900.webp). They go in srcset so a phone downloads
   a 480 px file instead of the 1600 px original; a photo with no copies is
   simply served as before. `sizes` tells the browser how wide the photo is
   shown: news photos up to ~600 px (hover zoom included), portraits ~380 px. */
const VARIANT_WIDTHS = [480, 900];
const srcsetFor = (src, fullWidth) => {
  const m = src.match(/^\/assets\/img\/(.+)\.jpe?g$/i);
  if (!m) return '';
  const found = VARIANT_WIDTHS
    .map((w) => [`/assets/img/r/${m[1]}-${w}.webp`, w])
    .filter(([file]) => existsSync(join(OUT, file.slice(1))));
  if (!found.length) return '';
  const sizes = /\/img\/people\//.test(src) ? '(max-width: 720px) 92vw, 380px'
    : /cell-multiplexing/.test(src) ? '100vw'
    : '(max-width: 720px) 92vw, 600px';
  return ` srcset="${[...found, [src, fullWidth]].map(([f, w]) => `${f} ${w}w`).join(', ')}" sizes="${sizes}"`;
};
const withImageSizes = (html) => html.replace(/<img\b[^>]*>/g, (tag) => {
  if (/\swidth=/.test(tag)) return tag;
  const src = tag.match(/\ssrc="(\/[^"]+)"/)?.[1];
  const size = src && imageSize(src);
  return size ? tag.replace(/\s*\/?>$/, `${srcsetFor(src, size[0])} width="${size[0]}" height="${size[1]}" />`) : tag;
});

/* "Yingying He" → "yingying-he": the stable address of a person on /people/. */
const slugify = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Author names shown in bold on Publications. `Liu B` everywhere; add other
   lab members per paper with "labAuthors": ["Wang B", …] in publications.json
   (per paper, because "Li M" is not the same person in every author list).
   Markers after a name (shown as superscripts): * co-first, # corresponding. */
const LAB_AUTHORS = ['Liu B'];
const authorsHtml = (p) => {
  let html = esc(p.authors);
  for (const name of [...LAB_AUTHORS, ...(p.labAuthors || [])]) {
    const re = new RegExp(`(^|, )(${esc(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[*#]*(,|$))`);
    html = html.replace(re, '$1<strong class="pub__lab">$2</strong>');
  }
  // The * and # after a name are set as superscripts.
  return html.replace(/([*#]+)(?=,|$)/g, '<sup>$1</sup>');
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

const SITE = 'https://www.liubeilab.com';
const jsonLd = (obj) => `\n<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const shell = ({ key, path, title, desc, body, heroCss = '', image = SHARE_CARD, extraHead = '', lang = 'en' }) => withImageSizes(`<!doctype html>
<html lang="${lang}">
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
<script type="application/ld+json">${ORG_JSONLD}</script>` : ''}${extraHead}
<link rel="alternate" type="application/rss+xml" title="Liu Lab news" href="/news/feed.xml" />
<link rel="icon" href="/assets/img/mark.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600&family=Spectral:ital,wght@0,300;0,400;0,600;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/styles.css" />${heroCss ? `\n<style>${heroCss}</style>` : ''}${/url\('([^']+)'\)/.test(heroCss) ? `\n<link rel="preload" as="image" href="${heroCss.match(/url\('([^']+)'\)/)[1]}" fetchpriority="high" />` : ''}
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
`);

/* ---------------- reusable fragments ---------------- */

const pubEntry = (p) => `
  <article class="pub"${p.featured ? ' data-featured' : ''}>
    <div class="pub__n">${esc(p.idx)}</div>
    <div>
      <h3 class="pub__title">${esc(p.title)}</h3>
      <p class="pub__authors">${authorsHtml(p)}</p>
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
  ['join-us-zh',   'join',     '/join-us/zh/',   'join-us/zh/index.html'],   // Chinese version (lang: zh-CN)
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
const byYear = (list) => {
  const groups = [];
  for (const p of list) {
    const last = groups[groups.length - 1];
    if (last && last.year === p.year) last.items.push(p);
    else groups.push({ year: p.year, items: [p] });
  }
  return groups;
};
/* One list, year by year. A dashed line marks where the lab began: papers
   below it are from before Bei's independence. The two 2022 papers are
   postdoc-era work too (Bei, 2026-11-17), so the line sits above 2022. */
const INDEPENDENT_SINCE = 2023;
const pubYearGroups = byYear(publications);
const firstEarlier = pubYearGroups.findIndex((g) => g.year < INDEPENDENT_SINCE);
const yearSections = pubYearGroups.map((g, i) => `${i === firstEarlier && i > 0 ? `
        <p class="pub-divider" id="before-independence"><span>Before independence</span></p>` : ''}
        <section class="pub-year">
          <h2 class="pub-year__label">${esc(g.year)}</h2>
          ${g.items.map(pubEntry).join('')}
        </section>`).join('');

const pi = team[0];
/* Members keep one address each (/people/#given-surname) and are grouped by
   role; assets/people.js shuffles the order inside each role, per visit. */
const ROLE_ORDER = ['Lab Manager', 'Postdoc', 'Research Assistant', 'PhD Student', "Master's Student", 'Undergraduate'];
const roleRank = (role) => {
  const i = ROLE_ORDER.findIndex((r) => String(role).toLowerCase().startsWith(r.toLowerCase()));
  return i === -1 ? ROLE_ORDER.length : i;
};
const members = team.slice(1)
  .map((m) => ({ ...m, id: m.id || slugify(m.nameEn), group: roleRank(m.role) }))
  .sort((a, b) => a.group - b.group || a.sortOrder - b.sortOrder);
{
  const ids = new Set();
  for (const m of members) {
    if (!m.id || ids.has(m.id)) throw new Error(`data/team.json: "${m.nameEn}" needs its own "id" (address "${m.id}" is empty or already taken)`);
    ids.add(m.id);
  }
}

const slots = {
  /* Home: latest featured paper and newest news post */
  latestPaper: latestPub ? `<h3 class="pub__title" style="font-size:1.34rem">${esc(latestPub.title)}</h3>
        <p class="pub__authors" style="margin-top:8px">${authorsHtml(latestPub)}</p>
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
  publications: yearSections,

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
        <article class="person" id="${esc(m.id)}" data-group="${m.group}">
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
          <div><b>${esc(a.nameZh || a.nameEn)}</b>${a.nameZh && a.nameEn ? `<span class="alumnus__en">${esc(a.nameEn)}</span>` : ''}<span class="meta">${esc(a.years)}</span></div>
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
  return { title: meta.title, desc: meta.description, heroCss: meta.heroCss || '', lang: meta.lang || 'en', body: `\n${html}` };
}

const pages = PAGES.map(([name, key, path, file]) => ({ key, path, file, ...loadPage(name) }));
// A shared News link previews the newest event's photo.
const newsPage = pages.find((p) => p.key === 'news');
if (latestPost?.cover) newsPage.image = latestPost.cover;

/* Join Us exists in English and Chinese: tell search engines they are the
   same page in two languages. */
{
  const alternates = `
<link rel="alternate" hreflang="en" href="${SITE}/join-us/" />
<link rel="alternate" hreflang="zh-CN" href="${SITE}/join-us/zh/" />
<link rel="alternate" hreflang="x-default" href="${SITE}/join-us/" />`;
  for (const p of pages) if (p.key === 'join') p.extraHead = alternates;
}

/* Structured data, so search engines read the PI as a person and each paper as
   the same work its DOI points to. */
pages.find((p) => p.key === 'people').extraHead = jsonLd({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: pi.nameEn,
  alternateName: pi.nameZh,
  jobTitle: 'Assistant Professor',
  email: 'beiliu@pku.edu.cn',
  url: `${SITE}/people/`,
  image: `${SITE}${pi.photo}`,
  affiliation: { '@type': 'CollegeOrUniversity', name: 'Peking University' },
  worksFor: { '@type': 'ResearchOrganization', name: 'Liu Lab', url: `${SITE}/` },
});
pages.find((p) => p.key === 'pubs').extraHead = jsonLd({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Liu Lab publications',
  numberOfItems: publications.length,
  itemListElement: publications.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'ScholarlyArticle',
      headline: p.title,
      datePublished: String(p.year),
      ...(p.doi ? { identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: p.doi }, sameAs: `https://doi.org/${p.doi}` } : {}),
    },
  })),
});

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

/* News feed: the posts have no pages of their own, so every item links to the
   timeline and carries its full text. Dates are fixed (noon Beijing time on
   the post's day), so rebuilding never changes the file by itself. */
const rfc822 = (d) => new Date(`${d}T12:00:00+08:00`).toUTCString();
const feedItems = posts.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date)).slice(0, 30);
writeFileSync(join(OUT, 'news/feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Liu Lab news</title>
<link>${SITE}/news/</link>
<atom:link href="${SITE}/news/feed.xml" rel="self" type="application/rss+xml" />
<description>News from Liu Lab at Peking University.</description>
<language>en</language>${feedItems.length ? `\n<lastBuildDate>${rfc822(feedItems[0].date)}</lastBuildDate>` : ''}
${feedItems.map((p) => `<item>
<title>${esc(p.title)}</title>
<link>${SITE}/news/</link>
<guid isPermaLink="false">liubeilab-news-${esc(p.slug)}</guid>
<pubDate>${rfc822(p.date)}</pubDate>
<description>${esc(markdown(p.body, { dropImages: true }) || p.excerpt)}</description>
</item>`).join('\n')}
</channel>
</rss>
`, 'utf8');

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
