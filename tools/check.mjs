/* Pre-publish checks for the site. Run after `node build.mjs`:
     node tools/check.mjs
   Exits 1 if anything would break the live site (missing photo, bad date,
   leaked front matter, broken link, duplicate paper …). Warnings are printed
   but don't block. Runs locally from the pre-commit hook (tools/hooks/) and on
   GitHub before every deploy (.github/workflows/deploy.yml).
   Node 18+. No dependencies. */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
// Site paths ("/assets/img/x.jpg") → file on disk.
const siteFile = (p) => join(ROOT, decodeURI(p.replace(/[?#].*$/, '')).replace(/^\//, ''));
// Case-sensitive existence: Windows ignores case but GitHub Pages doesn't, so
// "pi.JPG" for "pi.jpg" works locally and 404s live.
function exists(file) {
  if (!existsSync(file)) return false;
  let dir = ROOT;
  for (const part of relative(ROOT, file).split(sep)) {
    if (!readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name).split(sep).join('/')]);

function readJSON(f) {
  try { return JSON.parse(read(f)); }
  catch (e) { err(f, `not valid JSON — ${e.message}`); return []; }
}

const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === s;
};
const CJK = /[　-〿㐀-鿿＀-￯]/;

/* ---------------- news ---------------- */

// Same normalisation as build.mjs, but strict: anything the build would
// silently mis-parse is an error here.
function frontMatter(raw) {
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  raw = raw.replace(/\r\n?/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    let val = line.slice(i + 1).trim();
    if (/^".*"$/.test(val)) { try { val = JSON.parse(val); } catch { val = val.slice(1, -1); } }
    meta[line.slice(0, i).trim()] = val;
  }
  return { meta, body: m[2] };
}

const newsFiles = readdirSync(join(ROOT, 'news')).filter((f) => f.endsWith('.md'));
const posts = [];
const today = new Date().toISOString().slice(0, 10);
for (const f of newsFiles) {
  const where = `news/${f}`;
  if (!/^[a-z0-9][a-z0-9-]*\.md$/.test(f)) err(where, 'file name must be lowercase ASCII letters, digits and hyphens');
  const fm = frontMatter(read(where));
  if (!fm) { err(where, 'front matter missing or malformed (needs --- lines at top)'); continue; }
  const { meta, body } = fm;
  for (const k of ['title', 'date', 'excerpt', 'cover'])
    if (!meta[k]) (k === 'title' || k === 'date' ? err : warn)(where, `missing "${k}"`);
  if (meta.date && !isRealDate(meta.date)) err(where, `date "${meta.date}" is not a real YYYY-MM-DD date`);
  else if (meta.date > today) warn(where, `date ${meta.date} is in the future`);
  if (/^\s*(---|title:|date:|cover:|excerpt:)/m.test(body)) err(where, 'front-matter text found in the body — it would show on the page');
  if (CJK.test(`${meta.title}${meta.excerpt}${body}`)) warn(where, 'contains Chinese text — site text should be English');
  const imgs = [meta.cover, ...[...body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1].trim())].filter(Boolean);
  for (const src of imgs) {
    if (!src.startsWith('/assets/img/')) warn(where, `image "${src}" is outside /assets/img/`);
    else if (!exists(siteFile(src))) err(where, `image not found: ${src}`);
  }
  if (new Set(imgs).size > 6) warn(where, `${new Set(imgs).size} photos — the photo stack is styled for at most 6`);
  posts.push({ f, title: meta.title, date: meta.date });
}
const seen = new Map();
for (const p of posts) {
  const key = `${p.date}|${(p.title || '').toLowerCase()}`;
  if (seen.has(key)) err(`news/${p.f}`, `duplicate of news/${seen.get(key)} (same date and title)`);
  else seen.set(key, p.f);
}

/* ---------------- publications ---------------- */

const pubs = readJSON('data/publications.json');
const idxs = new Map();
const dois = new Map();
const thisYear = new Date().getFullYear();
for (const p of pubs) {
  const where = `publications #${p.idx ?? '?'} "${String(p.title ?? '').slice(0, 40)}"`;
  for (const k of ['idx', 'year', 'title', 'authors', 'journal'])
    if (p[k] === undefined || p[k] === '') err(where, `missing "${k}"`);
  if (!Number.isInteger(p.idx)) err(where, '"idx" must be a whole number');
  else if (idxs.has(p.idx)) err(where, `idx ${p.idx} used twice`);
  else idxs.set(p.idx, true);
  if (!Number.isInteger(p.year) || p.year < 1990 || p.year > thisYear + 1) err(where, `year "${p.year}" looks wrong`);
  if (!p.doi) warn(where, 'no DOI');
  else if (!/^10\.\d{4,9}\/\S+$/.test(p.doi)) err(where, `DOI "${p.doi}" is malformed (expected 10.xxxx/…, no https://doi.org/)`);
  else if (dois.has(p.doi.toLowerCase())) err(where, `DOI also used by #${dois.get(p.doi.toLowerCase())} — duplicate paper?`);
  else dois.set(p.doi.toLowerCase(), p.idx);
  if (typeof p.featured !== 'boolean') warn(where, '"featured" should be true or false');
}
if (pubs.length && !pubs.some((p) => p.featured)) warn('publications', 'no paper is featured — the home page falls back to the newest');

/* ---------------- people ---------------- */

function checkPeople(file, required) {
  const list = readJSON(file);
  const orders = new Map();
  for (const m of list) {
    const where = `${file} "${m.nameEn || m.nameZh || '?'}"`;
    for (const k of required) if (m[k] === undefined || m[k] === '') err(where, `missing "${k}"`);
    if (!m.nameEn && !m.nameZh) err(where, 'needs "nameEn" or "nameZh"');
    if (!Number.isFinite(m.sortOrder)) err(where, '"sortOrder" must be a number');
    if (m.photo && !exists(siteFile(m.photo))) err(where, `photo not found: ${m.photo}`);
    if (orders.has(m.sortOrder)) warn(where, `sortOrder ${m.sortOrder} also used by "${orders.get(m.sortOrder)}"`);
    else orders.set(m.sortOrder, m.nameEn);
  }
  return list;
}
const team = checkPeople('data/team.json', ['nameEn', 'role', 'photo']);
checkPeople('data/alumni.json', []);
const pi = [...team].sort((a, b) => a.sortOrder - b.sortOrder)[0];
if (pi && !/principal investigator/i.test(pi.role)) err('data/team.json', `first entry by sortOrder is "${pi.nameEn}", not the PI`);

for (const r of readJSON('data/resources.json')) {
  const where = `data/resources.json "${r.name ?? '?'}"`;
  if (!r.name || !r.category) err(where, 'needs "name" and "category"');
  if (!/^https?:\/\/\S+$/.test(r.url ?? '')) err(where, `url "${r.url}" is not a web address`);
}

/* ---------------- images ---------------- */

const sources = ['build.mjs', ...walk('assets').filter((f) => /\.(css|js)$/.test(f)),
  ...walk('data'), ...walk('pages'), ...newsFiles.map((f) => `news/${f}`)].map(read).join('\n');
for (const f of walk('assets/img')) {
  const kb = statSync(join(ROOT, f)).size / 1024;
  if (kb > 1024) err(f, `${Math.round(kb)} KB — resize with tools/resize-photo.ps1 (aim < 600 KB)`);
  else if (kb > 650) warn(f, `${Math.round(kb)} KB — consider resizing`);
  const name = f.split('/').pop();
  if (!sources.includes(name)) warn(f, 'not used anywhere — delete it with git rm?');
}

/* ---------------- built output ---------------- */

// Built pages only — pages/*.html are sources (checked via the build itself).
const htmlFiles = walk('.').filter((f) => f.endsWith('.html') && !/^(\.git|node_modules|tools|pages)\//.test(f));
if (!existsSync(join(ROOT, 'news/index.html'))) err('news/index.html', 'missing — run node build.mjs first');
for (const f of htmlFiles) {
  const html = read(f);
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    if (url.startsWith('//')) continue;
    let file = siteFile(url);
    if (url.replace(/[?#].*$/, '').endsWith('/')) file = join(file, 'index.html');
    if (!exists(file)) err(f, `broken link ${url}`);
  }
}
if (existsSync(join(ROOT, 'news/index.html'))) {
  const html = read('news/index.html');
  const items = (html.match(/<li class="tl-item">/g) || []).length;
  if (items !== posts.length) err('news/index.html', `${items} timeline items but ${posts.length} news posts — rebuild?`);
  const text = html.replace(/<[^>]+>/g, ' ');
  if (/(^|\s)---\s+title:|\btitle:\s*&quot;/.test(text)) err('news/index.html', 'raw front matter is showing on the page');
  for (const p of posts)
    if (p.title && !html.includes(p.title.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;')))
      err('news/index.html', `"${p.title}" is not on the page — rebuild?`);
}

/* ---------------- line endings ---------------- */

for (const f of ['build.mjs', ...walk('data'), ...walk('pages'), ...newsFiles.map((f) => `news/${f}`)])
  if (read(f).includes('\r\n')) warn(f, 'has Windows (CRLF) line endings');

/* ---------------- report ---------------- */

for (const w of warnings) console.log(`  warn   ${w}`);
for (const e of errors) console.log(`  ERROR  ${e}`);
console.log(`\n${posts.length} news posts, ${pubs.length} papers, ${team.length} team members, ${htmlFiles.length} pages checked: ` +
  `${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) { console.log('Fix the errors above before publishing.'); process.exit(1); }
