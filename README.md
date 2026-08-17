# liubeilab.com

Static front end for the Liu Lab site, served by GitHub Pages from this repository. Content comes from the lab's existing Wix site over its public API at page load — there is no server and no build server involved.

Live preview: <https://liubeilab.github.io/>

## Most updates need no code at all

Publications, team members, alumni, resources and news are **not** in this repository. They live in the Wix dashboard and are read by the browser when someone opens the page. Edit them there and the site reflects the change on the next page load — no commit, no deploy, nothing to run.

| To change | Where | Takes effect |
|---|---|---|
| A paper | Wix dashboard → CMS → `Publications` | Immediately |
| A lab member | Wix dashboard → CMS → `TeamMembers` | Immediately |
| A past member | Wix dashboard → CMS → `Alumni` | Immediately |
| A resource link | Wix dashboard → CMS → `Resources` | Immediately |
| A news post | Wix dashboard → Blog | Immediately |

Photos are ordinary URLs in the `photo` column, so a new member's portrait can point at any image already in the Wix Media Manager. The `sortOrder` column controls the order members appear in; leave gaps (10, 20, 30…) so someone can be inserted later without renumbering everyone.

## Changing the pages themselves

Page structure, section copy and the design live in this repository.

```
build.mjs        generates all eight pages + 404, sitemap and robots
assets/styles.css   the whole design system
assets/wix.js       the Wix data layer
assets/nav.js       mobile navigation
assets/img/         hero, tool illustrations, institutional marks
```

Everything else — `index.html`, `research/index.html` and so on — is **generated**. Editing those by hand works until the next build overwrites them, so make changes in `build.mjs` and rebuild:

```bash
node build.mjs
```

Then commit and push. GitHub Pages redeploys within about a minute.

Requires Node 18 or newer. There are no dependencies to install.

## Structure

Eight pages, each at its own URL so the addresses match the ones the Wix site has used since 2022:

`/` · `/research/` · `/technologies/` · `/open-science/` · `/publications/` · `/people/` · `/join-us/` · `/news/`

## The custom domain

`www.liubeilab.com` still points at Wix. Moving it here takes two steps: add a `CNAME` file to this repository containing `www.liubeilab.com`, then repoint the `www` DNS record at `liubeilab.github.io`. The `CNAME` file is deliberately absent until then — committing it early makes Pages switch to the custom domain and the site becomes unreachable until DNS catches up.

The Wix site stays published throughout and remains the fallback.
