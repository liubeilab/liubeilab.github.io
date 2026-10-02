# Liu Lab website — instructions for Claude

Bei Liu's lab site **www.liubeilab.com** (PKU · College of Future Technology ·
NBIC). GitHub Pages serves this repo, `liubeilab/liubeilab.github.io`, branch
`main` (old account `drbeiliu` is discontinued). `HANDOFF.md` is the human
playbook; this file holds the rules and lessons for Claude.

## Folder layout

```
Documents\Cowork\lab page\
├── site\     ← this repo (the permanent working copy — never clone to Temp)
├── news\     ← Bei drops event photos here, named by date: "2026.9.26 - hiking.jpg"
└── member\   ← new-member portraits, named by Chinese name: "马莉雅.jpg"
```

## Shortcuts (skills in `.claude/skills/`) — remind Bei every time

| Shortcut | What it does |
|---|---|
| `/add-news [note]` | News event from photos in `lab page\news` |
| `/add-paper <DOI or link>` | Paper from Crossref (`tools/add-paper.mjs`) |
| `/add-member [note]` | New person, photo from `lab page\member` |
| `/move-to-alumni <name> [years]` | Team → Alumni |
| `/site-check` | Build + checks + last deploy + live pages |
| `/lab-help` | List shortcuts + quick health check |

**Bei asked to be reminded of these.** End every reply that finishes a
website task (or answers a website question) with this line, verbatim:

> 💡 Shortcuts: `/add-news` · `/add-paper` · `/add-member` · `/move-to-alumni` · `/site-check` · `/lab-help`

When Bei asks in plain words ("add this paper", "new member"), use the
matching skill's steps anyway. When a new routine task repeats, propose a new
shortcut and add it to this table, `lab-help`, and HANDOFF.md.

Sessions should start in the **`site`** folder — skills load at start only
from the session folder. (From `lab page`, they load once a file in `site/`
is read.)

## Every update, in order

1. `git pull` first — the live repo may have changed.
2. Edit **source only**: `data/*.json`, `news/*.md`, `build.mjs`,
   `assets/*`. Never hand-edit generated `*/index.html` / `index.html` /
   `404.html` / `sitemap.xml`.
3. `node build.mjs` (Node 18+, no dependencies). It must finish without errors.
4. `node tools/check.mjs` — must report **0 errors**. Also confirm the built
   HTML contains the change (grep it).
5. `git add -A`, commit with a clear message (`News: …`, `People: …`,
   `Publications: …`, `Fix: …`), then `git push`.
6. Verify live: poll `https://www.liubeilab.com/<page>/?v=<random>` until the
   change appears (deploy ~1–2 min; CSS/JS edge-cached up to ~10 min).
7. Tell Bei what changed and that it is confirmed live.

## Safety net (don't bypass)

- **`tools/check.mjs`** validates sources and built pages: news front matter,
  real dates, every photo/link exists (**case-sensitive** — Windows ignores
  case, GitHub Pages doesn't), duplicate papers/DOIs, PI first, image sizes,
  leaked front matter, timeline = number of posts. Warnings don't block.
  When a new kind of mistake happens, **add a check for it here**.
- **Pre-commit hook** (`tools/hooks/pre-commit`, enabled by
  `git config core.hooksPath tools/hooks` — set it again on any fresh clone)
  rebuilds, refuses the commit if regenerated pages aren't staged, then runs
  the check. Never use `--no-verify`.
- **GitHub Action** (`.github/workflows/deploy.yml`) rebuilds on GitHub,
  fails if committed pages ≠ fresh build, runs the check, and only then
  deploys. A failed run keeps the previous version live. Pages source must be
  "GitHub Actions" (switched 2026-10-02). After each push, watch the run via
  the public API (no auth, no `gh` needed):
  `curl -s "https://api.github.com/repos/liubeilab/liubeilab.github.io/actions/runs?per_page=1"`
  → `status`/`conclusion`; per-step results at `…/actions/runs/<id>/jobs`.
  A run takes ~1 min. If it fails, read the failing step and fix — the live
  site is untouched meanwhile.

## Rules (from Bei)

- **Draft text first, publish after approval** for anything about visitors,
  guests, talks or awards. Show the draft in chat; apply only after a yes.
  Short casual lab-life posts may go straight up if Bei gave the wording.
- **Dates come from photo filenames** (`2026.9.26 - x.jpg` → `2026-09-26`).
- **Never guess who is who in photos** — face→name mapping comes from Bei.
- **Never guess author roles.** If the source doesn't state the corresponding
  author (`*`) or equal contribution (`#`), add the paper without markers and
  ask.
- Site text is **English**. Names in People: `nameEn` "Given Surname" plus
  `nameZh`.
- Photos are shown **whole, never cropped** (People and News).

## Content formats

**News** — `news/<ascii-slug>.md` (slug is internal, never a URL):
```markdown
---
title: "Short English title"
date: 2026-09-26
excerpt: "One line, used on the home page teaser and meta description."
cover: /assets/img/news/<slug>-a.jpg
---
One or two sentences.

![](/assets/img/news/<slug>-b.jpg)
```
Order is purely by `date` (newest first; same-date ties broken by slug).
2+ photos render as an overlapping hover stack automatically.
Visitor titles: be consistent — "Prof. Full Name visits PKU".

**Publications** — `data/publications.json`, newest first; new entry goes on
top with `idx` = previous max + 1. Fields: `idx, year, title, authors,
journal, doi, featured`. Authors as `Surname Initials` (`Liu B`), `*` =
corresponding, `#` = equal contribution, `et al.` for long lists. Journal as
`Journal Volume(Issue), pages`. Get metadata from Crossref:
`https://api.crossref.org/works/<DOI>` (more reliable than scraping the page).

**People** — `data/team.json`: `sortOrder` (gaps of 10), `nameEn`, `nameZh`,
`role`, `bio`, `photo`. PI is the first entry. Graduates move to
`data/alumni.json` (with years). The People page shuffles member order per visit.

## Images

- Resize before committing: `tools/resize-photo.ps1` (longest side 1600 px,
  JPEG q85, honors EXIF rotation). Portraits ~900×1200, alumni ~400 px.
- Name files by slug: `lab-hike-2026-a.jpg`, `-b`, `-c` …
- When replacing a photo, `git rm` the old file — no orphans.

## Machine facts (Windows)

- No Python, no ImageMagick, no `gh` CLI. Node and PowerShell are available;
  use PowerShell `System.Drawing` for images, Node for scripts.
- Push auth = Windows Git Credential Manager (user `liubeilab`); it just works.
- This clone sets `core.autocrlf=false`; `.gitattributes` forces LF. Keep it.

## Lessons learned (bugs that already happened — don't repeat)

- **CRLF broke frontmatter** → raw `--- title: …` leaked onto the live News
  page. `parseFrontMatter` now normalizes BOM/CRLF. Any new parser must too.
- **Lightbox showed on page load** because `.lightbox { display:flex }`
  overrode the `hidden` attribute. Any element toggled with `hidden` needs an
  explicit `[hidden] { display:none }` rule.
- **CSS `columns` masonry glitched** (duplicated then dropped a card on
  scroll) → People uses JS flex columns (`assets/people.js`). Don't revert.
- **Browser-pane screenshots tear/time out** on long lazy-loaded pages →
  verify layout with DOM measurements (`getBoundingClientRect`) or fetch the
  HTML, not mid-page screenshots.
- Fresh clones lack `user.name`/`user.email` → commits fail. Set them in the
  repo config (already done for this clone).
- The old Temp clone got half-deleted between sessions → work only in this
  permanent folder.

## Analytics

Cloudflare Web Analytics beacon in the page shell (`build.mjs`), token
`f6f9efe816f1451490ace5de63fc749a`. Private dashboard only:
dash.cloudflare.com → **Web Analytics** (not "Account analytics", which shows
0 for this site).

## Improvement plan (from the 2026-10-02 review)

Doing these one at a time, each approved by Bei:

1. [x] Permanent working copy in `Cowork\lab page\site`
2. [x] This CLAUDE.md
3. [x] Pre-publish check script + pre-commit hook + GitHub Action that blocks
       a broken build (2026-10-02)
4. [x] Shortcuts: `/add-news`, `/add-paper`, `/add-member`, `/move-to-alumni`,
       `/site-check`, `/lab-help` (2026-10-02)
5. [ ] Photo inbox → `processed/` convention
6. [ ] Content: one consistent research taxonomy across Home/Research/
       Technologies/Join Us; merge Technologies into Research; richer
       bios + PI profile; bold lab members + Scholar/ORCID on Publications;
       bilingual Join Us; consistent visitor titles
7. [ ] Technical: alt text on news photos, `og:image` for link previews,
       rename 14 legacy `a12b36_*` images, move page prose out of build.mjs
8. [ ] Design: an image on the text-only pages; optional light mode
