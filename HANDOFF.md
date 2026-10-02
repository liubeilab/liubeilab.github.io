# Liu Lab website — handoff & maintenance

Everything you need to keep **www.liubeilab.com** running and up to date.
Companion to `README.md`; this file is the practical playbook.

## What this site is

- A **static site** served by **GitHub Pages** from `liubeilab/liubeilab.github.io`
  (branch `main`, custom domain via the `CNAME` file → `www.liubeilab.com`).
- **No Wix, no server, no database.** Every piece of content is a file in
  this repo; one Node script (`build.mjs`) generates all the pages.
- It used to pull content live from a Wix CMS. That was fully **migrated into the
  repo** — the site no longer depends on Wix or anything external (except a
  privacy-friendly analytics beacon, see below).

## Update anything in three steps

1. Edit a data file or a news post (see below).
2. Run the build and the checks:
   ```bash
   node build.mjs && node tools/check.mjs
   ```
   Node 18+ required. **No dependencies to install.** The check must say
   `0 error(s)`; it explains anything it finds (missing photo, bad date,
   broken link, duplicate paper …).
3. Commit and push:
   ```bash
   git add -A && git commit -m "..." && git push
   ```
   A pre-commit hook re-runs the build + check and refuses a bad commit. On
   GitHub, the "Check and deploy" Action runs everything again and only then
   publishes (about 1–2 minutes). If it fails, the previous version stays live
   and GitHub emails you; see the **Actions** tab of the repo.

With Claude Code you can just say what changed ("add this paper", "add a news
post about X with these photos") and it will do steps 1–3.

### Claude Code shortcuts

Open Claude Code in the **`Documents\Cowork\lab page\site`** folder, then type:

| Shortcut | What it does | Example |
|---|---|---|
| `/add-news` | News event from photos in `lab page\news` (named by date) | `/add-news 9.26 lab hike + dinner` |
| `/add-paper` | Paper from its DOI or link | `/add-paper 10.52601/bpr.2025.250024` |
| `/add-member` | New person; photo in `lab page\member` (named in Chinese) | `/add-member 曾燕, undergrad, summer 2026` |
| `/move-to-alumni` | Team → Alumni | `/move-to-alumni Shenyi Lu 2024-2026` |
| `/site-check` | Health check: checks, last deploy, live pages | `/site-check` |
| `/lab-help` | Shows this list | `/lab-help` |

**Photo inboxes:** drop new photos directly in `lab page\news` or
`lab page\member`. Once they're live, Claude moves them into the `processed`
subfolder and notes in `processed\_log.txt` which post or person each went to,
so nothing is ever posted twice. An empty inbox = everything is published.

Each one follows the same steps every time (draft for approval when needed,
resize photos, build, check, publish, confirm live). They live in
`.claude/skills/`; the helper for papers is `tools/add-paper.mjs`.

## Where content lives

| Content | File | Notes |
|---|---|---|
| Publications | `data/publications.json` | newest first by `idx`; one `featured:true` leads the home page |
| Team | `data/team.json` | **first entry is the PI**; `sortOrder` ascending (gaps of 10) |
| Alumni | `data/alumni.json` | `sortOrder` ascending |
| Resources | `data/resources.json` | grouped by `category` on the Open Science page |
| News | `news/*.md` | one Markdown file per event (see below) |
| Photos | `assets/img/{people,alumni,news}/` | plus hero/tool/mark art in `assets/img/` |
| Page copy & design | `build.mjs`, `assets/styles.css` | the generated `*.html` are outputs — don't hand-edit |

## News (the timeline)

The `/news/` page is a **self-contained animated timeline**: a center spine with
a progress line that fills as you scroll, events alternating left/right, each
popping in as it enters view (`assets/timeline.js`). **Everything shows inline —
there are no per-event pages to click into.**

Each post is `news/<anything>.md`:

```markdown
---
title: "A short English title"
date: 2026-01-17           # ordering is purely by this date, newest first
excerpt: "One line (used for the home 'From the lab' teaser + meta description)."
cover: /assets/img/news/my-photo.jpg
---
A sentence or two of body text, shown on the timeline.

![](/assets/img/news/second-photo.jpg)
![](/assets/img/news/third-photo.jpg)
```

- **Order** = the `date` field. To move an event, change its date.
- **One photo** → shown whole. **Several photos** (cover + any in the body) →
  an **overlapping "stack"**: on desktop they fan out slightly and the one you
  hover lifts and enlarges to the front; on mobile they fall back to a column.
  Sizing for 2–6 photos is handled by `data-count` rules in `styles.css`.
- **Click any news photo** to open it **full-screen** (a lightbox,
  `assets/lightbox.js`); close with the ✕, click-outside, or Escape.
- **Slugs / filenames are internal only** (never appear in URLs) — name them
  anything readable. Keep titles/text in **English**.

## People

- `data/team.json` entries: `sortOrder`, `nameEn` ("Given Surname"), `nameZh`,
  `role`, `bio`, `photo`.
- The People page is a **masonry gallery** — photos shown **whole** (uncropped),
  columns of varied height. Add a member's photo to `assets/img/people/` and
  point `photo` at it.
- The masonry is built by `assets/people.js` (balanced **flex columns**, not CSS
  `columns`, which had a repaint glitch). It also **shuffles the member order on
  every visit**, so no student is always first.
- Alumni render as small thumbnails from `data/alumni.json`.

## Preparing images

Resize new photos to about **1600 px on the longest side** before committing
(keeps the repo lean and pages fast). Rough targets: news covers/gallery
~1600 px; people portraits ~900×1200; alumni ~400.

On this Windows machine there is **no ImageMagick and no Python on PATH**. Use
PowerShell's built-in imaging (`System.Drawing`), and **honor EXIF orientation**
(property id 274) so phone photos don't come out sideways. Use the script in
the repo:

```powershell
powershell -File tools/resize-photo.ps1 -In "..\news\2026.9.26 - hiking.jpg" -Out assets/img/news/lab-hike-2026-a.jpg
```

Claude's own rules and lessons learned live in `CLAUDE.md`.

## Analytics

**Cloudflare Web Analytics** (privacy-friendly, cookieless). The beacon is in the
page shell in `build.mjs`; the token sits in the HTML (public by design). There
is **no widget on the site** — the numbers (visits, page views, top countries)
live only on your private dashboard:
**dash.cloudflare.com → Web Analytics → liubeilab.com**.

## Deploy notes & gotchas

- **Deploy timing:** ~1 min after `git push` to `main`. New HTML pages appear
  quickly; **CSS/JS are edge-cached up to ~10 min** (`Cache-Control: max-age=600`),
  so a CSS-only change can lag a few minutes before it's visible live.
- **Push auth:** the machine's **Git Credential Manager** holds the `liubeilab`
  GitHub credential — pushes just work.
- **Working copy:** the permanent clone is `Documents\Cowork\lab page\site`.
  Start Claude Code sessions in `lab page` or `lab page\site`. Don't clone into
  Temp or deep folders (Windows `Filename too long` / cleanup risk).
- **Line endings:** git shows CRLF↔LF warnings on Windows; harmless (content is
  stored LF).

## Don't

- Don't hand-edit the generated `*.html` — they're overwritten on the next build.
  Change `build.mjs`, `data/*`, or `news/*` and rebuild.
- Don't reintroduce Wix or any external content source — the site is
  self-contained on purpose.
