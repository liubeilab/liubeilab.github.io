---
name: add-news
description: Add an event to the News timeline of the Liu Lab website from photos Bei dropped in the lab page\news folder. Use for any new news post, lab event, visitor, talk, trip or celebration.
argument-hint: [what happened, or leave empty to look at the newest photos]
---

# Add a news event to www.liubeilab.com

Bei's note: $ARGUMENTS

1. `git pull` in the site repo.
2. **Find the photos** in `..\news\` (the `lab page\news` folder). New ones
   are those not yet used: newest by modified time, and/or whose filename
   date is after the newest post in `news/*.md`. The filename gives the date
   (`2026.9.26 - hiking.jpg` → `2026-09-26`). If several dates or events are
   mixed, list them and ask which to post. Look at every photo.
3. **Draft the post**: English title, one-line excerpt, 1–3 sentences of body.
   Match the tone of recent posts (`news/*.md`, newest first). Facts come only
   from Bei's note, the photos (flyers, banners) and Bei's answers — never
   invent names, titles, affiliations or talk topics. Never guess who is who.
   Visitor title style: "Prof. Full Name visits PKU".
   - **Visitors, guests, talks, awards, milestones → show the draft and wait
     for Bei's approval before publishing.**
   - Casual lab-life posts where Bei gave the wording → publish directly.
4. **Photos**: choose the cover (best group/scene shot first), then resize each
   with `tools/resize-photo.ps1` to `assets/img/news/<slug>-a.jpg`, `-b`, …
   (`<slug>` = short ASCII, e.g. `lab-hike-2026`). 2–6 photos become a hover
   stack automatically; more than 6 → ask Bei which to keep.
5. **Write** `news/<slug>.md` (format in CLAUDE.md): cover in front matter,
   extra photos as `![](/assets/img/news/<slug>-b.jpg)` lines in the body.
6. Publish with the routine in CLAUDE.md: build, `node tools/check.mjs`
   (0 errors), commit `News: <title> (<date>)`, push, watch the Actions run,
   verify the title and each photo URL live (`?v=<random>`).
7. If the `..\news\processed\` folder exists, move the used photos there.
8. Report: title, date, which photo is the cover, confirmed live. End with the
   shortcut reminder from CLAUDE.md.
