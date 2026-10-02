/* Look up a paper by DOI on Crossref and format it as a data/publications.json
   entry in the site's style.
     node tools/add-paper.mjs 10.52601/bpr.2025.250024          # preview only
     node tools/add-paper.mjs 10.52601/bpr.2025.250024 --write  # add on top
   Author markers (* corresponding, # equal contribution) are NOT added — the
   Crossref record doesn't carry them; ask Bei and edit by hand.
   Node 18+. No dependencies. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'data/publications.json');
const [, , rawDoi, flag] = process.argv;
if (!rawDoi) { console.error('usage: node tools/add-paper.mjs <DOI or doi.org URL> [--write]'); process.exit(2); }

const doi = decodeURIComponent(rawDoi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
const pubs = JSON.parse(readFileSync(FILE, 'utf8'));
const dup = pubs.find((p) => (p.doi || '').toLowerCase() === doi.toLowerCase());
if (dup) { console.error(`Already listed as #${dup.idx}: ${dup.title}`); process.exit(1); }

const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
if (!res.ok) {
  // exitCode, not exit(): exiting with a fetch handle open crashes Node on Windows.
  console.error(`Crossref has no record for ${doi} (HTTP ${res.status}). Check the DOI.`);
  process.exitCode = 1;
} else {
  addPaper((await res.json()).message);
}

// Crossref text carries HTML entities/tags ("Optics &amp; Laser"); the build
// escapes on output, so store plain text.
function plain(s = '') {
  return s.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) =>
    ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" }[e])).replace(/\s+/g, ' ').trim();
}

function addPaper(w) {
  // "Bei Liu" → "Liu B"; "Kun-Ming Hahn" → "Hahn KM".
  const initials = (given = '') => given.split(/[\s.-]+/).filter(Boolean).map((s) => s[0].toUpperCase()).join('');
  const names = (w.author || []).map((a) => (a.family ? `${a.family} ${initials(a.given)}`.trim() : a.name || ''));
  // Site style: list everyone up to 12 authors; longer lists are cut after
  // Liu B (if early) or after the first three, then "et al.".
  let authors = names;
  if (names.length > 12) {
    const me = names.findIndex((n) => n === 'Liu B');
    authors = [...names.slice(0, me >= 0 && me < 8 ? me + 1 : 3), 'et al.'];
  }

  const year = (w['published-print'] || w['published-online'] || w.issued)?.['date-parts']?.[0]?.[0];
  const journal = plain((w['container-title'] || [])[0] || w.publisher || '');
  const vol = w.volume ? ` ${w.volume}${w.issue ? `(${w.issue})` : ''}` : '';
  const pages = w.page || w['article-number'] || '';
  const entry = {
    idx: Math.max(0, ...pubs.map((p) => p.idx)) + 1,
    year,
    title: plain((w.title || [''])[0]),
    authors: authors.join(', '),
    journal: `${journal}${vol}${pages ? `${vol ? ',' : ''} ${pages}` : ''}`.trim(),
    doi,
    featured: false,
  };

  console.log(JSON.stringify(entry, null, 2));
  if (!names.includes('Liu B')) console.log('\nNote: "Liu B" is not in the author list — check this is the right paper.');
  console.log(`Crossref type: ${w.type}; ${names.length} authors.`);

  if (flag === '--write') {
    pubs.unshift(entry);
    writeFileSync(FILE, `${JSON.stringify(pubs, null, 2)}\n`, 'utf8');
    console.log(`\nAdded as #${entry.idx} at the top of data/publications.json.`);
  }
}
