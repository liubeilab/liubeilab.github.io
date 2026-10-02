---
name: lab-help
description: Show Bei the shortcuts available for maintaining the Liu Lab website and how to use them, plus a quick health check of the site.
---

# Website shortcuts — help

1. Show Bei this list (as a short table), exactly these commands:

   | Shortcut | What it does | Example |
   |---|---|---|
   | `/add-news` | New event on the News timeline from photos in `lab page\news` | `/add-news 9.26 lab hike + dinner, 2 photos` |
   | `/add-paper` | Add a paper from its DOI or link | `/add-paper 10.52601/bpr.2025.250024` |
   | `/add-member` | New person on People, photo from `lab page\member` | `/add-member 曾燕, undergrad from Xiamen Univ., summer 2026` |
   | `/move-to-alumni` | Move someone from the team to Alumni | `/move-to-alumni Shenyi Lu 2024-2026` |
   | `/site-check` | Health check: run all checks, list warnings | `/site-check` |
   | `/lab-help` | This list | |

   Also: plain requests always work ("fix the typo in X's bio", "replace the
   Onur photo"). Photos: name them by date (`2026.9.26 - hiking.jpg`) for news,
   by Chinese name (`马莉雅.jpg`) for members.

2. Then run a quick health check silently: `git pull`, `node build.mjs`,
   `node tools/check.mjs`, and the latest Actions run status (public API, see
   CLAUDE.md), and count files waiting in `..\news\` and `..\member\` (not in
   `processed\`). Report in one or two lines: errors/warnings count, whether
   the last deploy succeeded, and any photos waiting to be posted.
