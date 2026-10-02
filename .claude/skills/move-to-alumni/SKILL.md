---
name: move-to-alumni
description: Move a graduated or departed member from the team to the Alumni section of the Liu Lab People page.
argument-hint: <name> [years, e.g. 2024-2026] [what they did / where they went]
---

# Move a member to Alumni on www.liubeilab.com

Bei's note: $ARGUMENTS

1. `git pull` in the site repo.
2. Find the person in `data/team.json` (match `nameEn` or `nameZh`). If more
   than one could match, ask.
3. Years: from Bei's note; otherwise start year from their bio and end year =
   this year — **confirm with Bei** if not stated.
4. Make the alumni photo: resize their people photo to ~400 px into
   `assets/img/alumni/<given>-<surname>.jpg`
   (`tools/resize-photo.ps1 -MaxSide 400`).
5. Add to `data/alumni.json` (`sortOrder` = max + 10, `nameZh`, `nameEn`,
   `years`, `photo`; match the existing entries' fields). Remove them from
   `data/team.json`, and `git rm` the old people photo if nothing else uses it.
6. Publish with the routine in CLAUDE.md: build, `node tools/check.mjs`
   (0 errors), commit `People: move <nameEn> to alumni`, push, watch the
   Actions run, verify on `https://www.liubeilab.com/people/?v=<random>`.
7. Report, confirmed live. End with the shortcut reminder from CLAUDE.md.
