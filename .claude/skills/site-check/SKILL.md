---
name: site-check
description: Health check of the Liu Lab website — run the build and all checks, confirm the last deploy and that every live page loads, and explain any warnings in plain words.
---

# Website health check

1. `git pull`, `node build.mjs`, `node tools/check.mjs`.
2. Latest deploy: `curl -s "https://api.github.com/repos/liubeilab/liubeilab.github.io/actions/runs?per_page=3"`
   → status/conclusion of the most recent "Check and deploy" run.
3. Live pages: request each of `/ /research/ /technologies/ /open-science/
   /publications/ /people/ /join-us/ /news/` on `https://www.liubeilab.com`
   with `?v=<random>`; all must be 200.
4. Inboxes: list files waiting directly in `..\news\` and `..\member\`
   (not in `processed\`) — these are photos not yet on the site.
5. Report to Bei in plain words: photos waiting in the inboxes, errors (must fix — offer to fix), warnings
   (explain each briefly; offer fixes), last deploy result, live status.
   Don't change anything without Bei's go-ahead.
6. End with the shortcut reminder from CLAUDE.md.
