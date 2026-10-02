---
name: add-member
description: Add a new lab member (student, postdoc, staff) to the People page of the Liu Lab website, using a portrait from the lab page\member folder.
argument-hint: [name, role, start date, research focus]
---

# Add a lab member to www.liubeilab.com

Bei's note: $ARGUMENTS

1. `git pull` in the site repo.
2. **Photo**: in `..\member\` (the `lab page\member` folder), portraits are
   named by Chinese name (`马莉雅.jpg`). The filename is the identity — never
   match faces to names yourself. Every file directly in the folder is new;
   published portraits are in `..\member\processed\`. Look at it to check
   orientation.
3. **Details** — collect, asking Bei only for what is missing:
   - `nameZh` (from the filename), `nameEn` as "Given Surname" in pinyin
     (confirm unusual romanizations with Bei — e.g. 马莉雅 is "Liya Ma"),
   - `role`: one of PhD Student / Master's Student / Undergraduate /
     Postdoctoral Fellow / Research Assistant / Lab Manager (or as Bei says),
   - start term and research focus for the bio. Bio style: one sentence,
     "<Given> joined in <term> <year> and works on <focus>." (see team.json).
4. Resize: `tools/resize-photo.ps1 -In "..\member\<name>.jpg" -Out
   assets/img/people/<given>-<surname>.jpg -MaxSide 1200` (ASCII filename).
5. Add the entry to `data/team.json` with `sortOrder` = current max + 10
   (order on the page is shuffled per visit anyway). Keep the PI first.
6. Publish with the routine in CLAUDE.md: build, `node tools/check.mjs`
   (0 errors), commit `People: add <nameEn> (<nameZh>)`, push, watch the
   Actions run, verify the name and photo on
   `https://www.liubeilab.com/people/?v=<random>`.
7. **Only after it's confirmed live**, move the portrait to
   `..\member\processed\` and append to `..\member\processed\_log.txt`:
   `YYYY-MM-DD | <file> | data/team.json <nameEn> -> <photo path>`.
8. Report the card as it appears (names, role, bio), confirmed live. End with
   the shortcut reminder from CLAUDE.md.
