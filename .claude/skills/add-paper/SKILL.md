---
name: add-paper
description: Add a publication to the Liu Lab website from its DOI or article URL. Use when Bei asks to add/update a paper on the publications page.
argument-hint: <DOI or article link>
---

# Add a paper to www.liubeilab.com

Input: $ARGUMENTS (a DOI, a doi.org link, or a journal article URL).

1. `git pull` in the site repo.
2. If the input is a journal URL rather than a DOI, find the DOI on that page
   (the article URL usually contains it, e.g. `/doi/10.xxxx/...`).
3. Preview: `node tools/add-paper.mjs <DOI>`. It looks the paper up on Crossref,
   formats it in the site's style, and refuses duplicates.
   - If it says "Liu B" isn't an author, stop and ask Bei.
   - If Crossref has no record, fetch the article page and fill the entry by
     hand in the same format.
4. **Author markers:** Crossref doesn't record corresponding (`*`) or equal
   contribution (`#`). Check the article page; if it states them, add them.
   If not stated, add without markers and **ask Bei** in the final message.
   Never guess.
5. Write it: `node tools/add-paper.mjs <DOI> --write`, then hand-edit markers
   if needed. Keep `featured: false` unless Bei asks (featured papers lead the
   home page; currently the major first/corresponding-author papers).
6. Publish with the routine in CLAUDE.md ("Every update, in order"): build,
   `node tools/check.mjs` (0 errors), commit `Publications: add <short title> (<journal> <year>)`,
   push, watch the Actions run, verify the title on
   `https://www.liubeilab.com/publications/?v=<random>`.
7. Report the formatted citation as it appears, any open questions (markers,
   featured), and end with the shortcut reminder from CLAUDE.md.
