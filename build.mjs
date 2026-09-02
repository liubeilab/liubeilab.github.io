/* Builds the static site from local content — no runtime data fetching.
   Structured content lives in data/*.json; news posts are Markdown files in
   news/. Header and footer are baked into the emitted HTML so crawlers see real
   markup and each route keeps its own URL. Run: node build.mjs
   Requires Node 18+. No dependencies. */

import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const readJSON = (f) => JSON.parse(readFileSync(join(OUT, f), 'utf8'));

/* ---------------- content ---------------- */

const publications = readJSON('data/publications.json').sort((a, b) => b.idx - a.idx);
const team         = readJSON('data/team.json').sort((a, b) => a.sortOrder - b.sortOrder);
const alumni       = readJSON('data/alumni.json').sort((a, b) => a.sortOrder - b.sortOrder);
const resources    = readJSON('data/resources.json').sort((a, b) => a.sortOrder - b.sortOrder);

/* News: one Markdown file per post, `<name>.md`, with YAML-ish front matter. */
function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (/^".*"$/.test(val)) { try { val = JSON.parse(val); } catch { val = val.slice(1, -1); } }
    meta[key] = val;
  }
  return { meta, body: m[2] };
}

const posts = readdirSync(join(OUT, 'news'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { meta, body } = parseFrontMatter(readFileSync(join(OUT, 'news', f), 'utf8'));
    return { slug: f.replace(/\.md$/, ''), title: meta.title || '', date: meta.date || '',
             excerpt: meta.excerpt || '', cover: meta.cover || '', body: body.trim() };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

/* ---------------- helpers ---------------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatDate = (d) => {
  const dt = new Date(d);
  return Number.isNaN(+dt) ? String(d)
    : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* A small Markdown renderer — enough for lab news: paragraphs, headings, lists,
   blockquotes, rules, images (single and galleries), links, bold, italic, code.
   Text is HTML-escaped first, so post content cannot inject markup. */
const IMG = /^!\[([^\]]*)\]\(([^)]+)\)$/;
function inline(s) {
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, u) => `<img src="${u}" alt="${a}" loading="lazy" />`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}
function markdown(src, { skipImage = '' } = {}) {
  const blocks = src.trim().split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const imgs = lines.every((l) => IMG.test(l.trim())) ? lines.map((l) => l.trim().match(IMG)) : null;
    if (imgs) {
      const kept = imgs.filter((m) => m[2] !== skipImage);
      if (!kept.length) continue;
      const figs = kept.map(([, alt, src]) =>
        `<figure class="post-fig"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" /></figure>`).join('');
      out.push(kept.length > 1 ? `<div class="post-gallery">${figs}</div>` : figs);
    } else if (/^#{1,6}\s/.test(block)) {
      const level = block.match(/^#+/)[0].length;
      out.push(`<h${Math.min(level + 1, 4)}>${inline(block.replace(/^#+\s/, ''))}</h${Math.min(level + 1, 4)}>`);
    } else if (lines.every((l) => /^[-*]\s/.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`).join('')}</ul>`);
    } else if (lines.every((l) => /^\d+\.\s/.test(l))) {
      out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`);
    } else if (lines.every((l) => /^>\s?/.test(l))) {
      out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</blockquote>`);
    } else if (/^([-*_])\1{2,}$/.test(block)) {
      out.push('<hr />');
    } else {
      out.push(`<p>${inline(block.replace(/\n/g, '<br />'))}</p>`);
    }
  }
  return out.join('\n');
}

/* ---------------- shell ---------------- */

const NAV = [
  ['/',              'Home',            'home'],
  ['/research/',     'Vision/Research', 'research'],
  ['/technologies/', 'Technologies',    'tech'],
  ['/open-science/', 'Open Science',    'open'],
  ['/publications/', 'Publications',    'pubs'],
  ['/people/',       'People',          'people'],
  ['/join-us/',      'Join Us',         'join'],
  ['/news/',         'News',            'news'],
];

const shell = ({ key, path, title, desc, body, heroCss = '' }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="https://www.liubeilab.com${path}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:type" content="website" />
<link rel="icon" href="/assets/img/mark.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600&family=Spectral:ital,wght@0,300;0,400;0,600;1,400&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/styles.css" />${heroCss ? `\n<style>${heroCss}</style>` : ''}
</head>
<body>

<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <a class="brand" href="/" aria-label="Liu Lab home">
    <img src="/assets/img/logo.png" alt="Liu Lab" />
  </a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav">Menu</button>
  <nav class="nav" id="primary-nav" aria-label="Primary">
${NAV.map(([href, label, k]) => `    <a href="${href}"${k === key ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
  </nav>
</header>

<main id="main">
${body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div>
      <b>Liu Lab</b>
      <p class="meta" style="margin-top:10px">National Biomedical Imaging Center<br />College of Future Technology<br />Peking University</p>
      <p class="meta" style="margin-top:10px"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a> · <a href="https://github.com/liubeilab" target="_blank" rel="noopener">GitHub</a></p>
    </div>
    <div class="affil" style="border-top:0;margin-top:0;padding-top:0">
      <img class="affil__mark affil__mark--invert" src="/assets/img/pku.png" alt="Peking University" />
      <img class="affil__mark affil__mark--invert" src="/assets/img/cft.png" alt="College of Future Technology, Peking University" />
      <img class="affil__mark" src="/assets/img/nbic.png" alt="National Biomedical Imaging Center" />
    </div>
  </div>
</footer>

<script src="/assets/nav.js"></script>
</body>
</html>
`;

/* ---------------- reusable fragments ---------------- */

const pubEntry = (p) => `
  <article class="pub"${p.featured ? ' data-featured' : ''}>
    <div class="pub__n">${esc(p.idx)}</div>
    <div>
      <h3 class="pub__title">${esc(p.title)}</h3>
      <p class="pub__authors">${esc(p.authors)}</p>
      <p class="pub__journal">${esc(p.journal)}</p>
      ${p.doi ? `<a class="pub__doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">${esc(p.doi)}</a>` : ''}
    </div>
  </article>`;

const postCard = (p) => `
  <a class="post" href="/news/${esc(p.slug)}/">
    ${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy" />` : ''}
    <div class="post__body">
      <p class="meta">${esc(formatDate(p.date))}</p>
      <h2 class="post__title">${esc(p.title)}</h2>
      ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}
    </div>
  </a>`;

/* ---------------- pages ---------------- */

const pages = [];

const latestPub = publications.find((p) => p.featured) || publications[0];
const latestPost = posts[0];

/* --- Home --- */
pages.push({
  key: 'home', path: '/', file: 'index.html',
  title: 'Liu Lab — Decoding Dynamic States of Living Systems',
  desc: 'Liu Lab at the National Biomedical Imaging Center, Peking University, builds molecular, imaging and computational tools to observe living biology with greater precision.',
  heroCss: `.hero { --hero-image: url('/assets/img/hero-microscopy.jpg'); }`,
  body: `
  <section class="hero">
    <div class="hero__inner">
      <h1 class="h-hero">Decoding dynamic states of living systems.</h1>
      <p class="lead">We build molecular, imaging and computational tools to observe living biology with greater spatial, temporal, molecular and quantitative precision.</p>
      <div class="btns">
        <a class="btn btn--primary" href="/research/">Explore research</a>
        <a class="btn" href="/join-us/">Join the lab</a>
      </div>
      <div class="affil">
        <img class="affil__mark affil__mark--invert" src="/assets/img/pku.png" alt="Peking University" />
        <img class="affil__mark affil__mark--invert" src="/assets/img/cft.png" alt="College of Future Technology, Peking University" />
        <img class="affil__mark" src="/assets/img/nbic.png" alt="National Biomedical Imaging Center" />
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">What we build</p>
        <h2 class="h-section">Tools for seeing and steering living cells</h2>
        <p class="lead">We design the proteins, build the microscopes and write the algorithms — so that watching a process and controlling it become the same experiment.</p>
      </div>
      <div class="tools">

        <article class="tool">
          <img class="toolfig" src="/assets/img/tool-biosensor.jpg" alt="A cyan and a yellow fluorescent protein flanking a sensor domain: when the sensor closes, the two fluorophores come together, energy transfers, and the emission spectrum and fluorescence lifetime both shift" loading="lazy" />
          <div class="tool__body">
            <p class="tool__tag">See</p>
            <h3>Biosensors</h3>
            <p>Engineered proteins that turn a conformational change into a change in fluorescence — read out by FRET, fluorescence lifetime, or single-molecule tracking in living cells.</p>
          </div>
        </article>

        <article class="tool">
          <img class="toolfig" src="/assets/img/tool-optogenetics.jpg" alt="Membrane-anchored proteins under a beam of blue light: the illuminated ones have recruited a partner protein up from the cytoplasm and docked it at the membrane, while those left in the dark remain unbound" loading="lazy" />
          <div class="tool__body">
            <p class="tool__tag">Steer</p>
            <h3>Optogenetics</h3>
            <p>Light-controlled switches that recruit a protein to a chosen location, or turn its activity on and off — in seconds, and only where we illuminate.</p>
          </div>
        </article>

        <article class="tool">
          <img class="toolfig" src="/assets/img/tool-microscopy.jpg" alt="A microscope light path: laser excitation reflects off a dichroic mirror up through the objective into a dish of living cells; the emission returns to the camera, and the recorded image stack is then segmented, tracked from cell to cell, and reduced to a fluorescence-lifetime decay curve" loading="lazy" />
          <div class="tool__body">
            <p class="tool__tag">Observe</p>
            <h3>Microscopy</h3>
            <p>Imaging systems built in-house for live, quantitative measurement — single-molecule, light-sheet, fluorescence-lifetime and structured illumination — together with the analysis that turns a recording into numbers.</p>
          </div>
        </article>

        <article class="tool">
          <img class="toolfig" src="/assets/img/tool-protein-design.jpg" alt="A sequence fed through a neural network traces a path down an energy landscape, passing through successive folds to a minimum, and yields a designed protein that is then tested inside a cell" loading="lazy" />
          <div class="tool__body">
            <p class="tool__tag">Design</p>
            <h3>AI-based protein design</h3>
            <p>Generative models that propose new sensors, actuators and binders — which we then build and test directly in living cells, closing the loop between design and measurement.</p>
          </div>
        </article>

      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">What we work on</p>
        <h2 class="h-section">Four questions, one toolkit</h2>
      </div>
      <ul class="topics">
        <li><a href="/research/#immune"><b>Immune cell signalling</b><span>Macrophage podosomes to immune synapses</span></a></li>
        <li><a href="/research/#neuronal"><b>Neuronal nuclear states</b><span>Activation, phosphorylation and condensates</span></a></li>
        <li><a href="/research/#mechano"><b>Mechanobiology</b><span>How force becomes molecular signal</span></a></li>
        <li><a href="/research/#protein"><b>AI-based protein design</b><span>Designed biosensors, actuators and binders</span></a></li>
      </ul>
    </div>
  </section>

  <section class="section">
    <div class="wrap recent">
      <div>
        <p class="eyebrow">Latest paper</p>
        ${latestPub ? `<h3 class="pub__title" style="font-size:1.34rem">${esc(latestPub.title)}</h3>
        <p class="pub__authors" style="margin-top:8px">${esc(latestPub.authors)}</p>
        <p class="pub__journal">${esc(latestPub.journal)}</p>
        ${latestPub.doi ? `<a class="pub__doi" href="https://doi.org/${esc(latestPub.doi)}" target="_blank" rel="noopener">${esc(latestPub.doi)}</a>` : ''}` : ''}
        <p style="margin-top:22px"><a class="btn" href="/publications/">All publications</a></p>
      </div>
      <div>
        <p class="eyebrow">From the lab</p>
        ${latestPost ? `<p class="meta">${esc(formatDate(latestPost.date))}</p>
        <h3 class="pub__title" style="font-size:1.34rem;margin-top:8px">${esc(latestPost.title)}</h3>
        ${latestPost.excerpt ? `<p class="body" style="margin-top:8px">${esc(latestPost.excerpt)}</p>` : ''}
        <a class="pub__doi" href="/news/${esc(latestPost.slug)}/">Read the post</a>` : ''}
        <p style="margin-top:22px"><a class="btn" href="/news/">More news</a></p>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="band">
        <div>
          <p class="eyebrow">Join Liu Lab</p>
          <h2 class="h-section">We welcome curious scientists and tool builders.</h2>
        </div>
        <div>
          <div class="btns"><a class="btn btn--primary" href="/join-us/">Open positions</a></div>
          <p class="meta" style="margin-top:14px"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a></p>
        </div>
      </div>
    </div>
  </section>`,
});

/* --- Vision / Research --- */
const STORIES = [
  ['immune',  'Immune response',    'How is signalling organised at immune-cell interfaces?', 'Immune responses emerge from signals assembled and remodelled in specific cellular locations. We investigate how molecular activity is coordinated in macrophages, podosomes and immune synapses, and how local organisation shapes cell behaviour.', 'immune-signaling.jpg', 'Conceptual visualisation of a macrophage with podosome-scale puncta and a localised immune signalling zone'],
  ['neuronal','Neuronal activation', 'How does activity reorganise the neuronal nucleus?',   'Neuronal activation reaches beyond the membrane and cytoplasm to reshape molecular organisation inside the nucleus. We study how phosphorylation and biomolecular condensation influence nuclear speckles, nucleolar organisation and other dynamic nuclear states.', 'neuronal-condensates.jpg', 'Conceptual visualisation of a neuron with long processes and a magnified view of nuclear speckles, nucleolus and biomolecular condensates'],
  ['mechano', 'Mechanobiology',      'How do physical forces become biochemical information?', 'Cells experience force through adhesion, cytoskeletal tension, membrane deformation and the surrounding matrix. We study how these physical inputs reorganise molecular states and propagate from force-bearing structures toward cellular decisions.', 'mechanobiology.jpg', 'Conceptual visualisation of cellular mechanobiology with stress fibres, focal adhesions, traction forces and substrate deformation'],
  ['protein', 'Protein design',      'Can we design the molecules we need to watch and steer cells?', 'We design biosensors, actuators and binders computationally, then test them directly in living cells — closing the loop between what a measurement requires and what a molecule can do.', 'protein-design.jpg', 'Conceptual visualisation of computationally designed protein structures'],
];

pages.push({
  key: 'research', path: '/research/', file: 'research/index.html',
  title: 'Vision & Research | Liu Lab',
  desc: 'Dynamic states connect molecular events to cellular decisions. Liu Lab studies immune signalling, neuronal nuclear states, mechanobiology and AI-based protein design.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Vision / Research</p>
      <h1 class="h-page">Dynamic states connect molecular events to cellular decisions.</h1>
      <p class="lead">Biology is often captured as a sequence of static snapshots. We seek to understand the transient states between those snapshots: where they arise, how long they persist, and how they shape cell behaviour.</p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Scientific premise</p>
        <h2 class="h-section">The most informative biology often exists between stable endpoints.</h2>
      </div>
      <div class="two-col">
        <p class="body">Cells continuously reorganise molecular interactions, signalling assemblies, organelles and mechanical structures. These changes can be local, short-lived and heterogeneous, yet they determine how cells sense their environment and choose a response.</p>
        <p class="body">Our research asks how such states can be observed directly in living systems and connected to mechanism. Tool development follows from that question, rather than serving as an endpoint of its own.</p>
      </div>
    </div>
  </section>

  <figure class="band-figure">
    <img src="/assets/img/cell-multiplexing.jpg" alt="A wide field of individually segmented cells, each rendered in a different colour against a black background" loading="lazy" />
    <figcaption class="meta">Single cells segmented from one imaging field, each given its own colour.</figcaption>
  </figure>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Research programmes</p>
        <h2 class="h-section">Biological systems where dynamics matter</h2>
      </div>
      ${STORIES.map(([id, eyebrow, q, body, img, alt]) => `
      <article class="story" id="${id}">
        <img src="/assets/img/${img}" alt="${alt}" loading="lazy" />
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h3 class="h-story">${q}</h3>
          <p class="body">${body}</p>
        </div>
      </article>`).join('')}
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">How we work</p>
        <h2 class="h-section">A programme organised around states, not techniques</h2>
      </div>
      <div class="grid" style="--cols:3">
        <article class="tile"><h3 class="h-card">Observe in living systems</h3><p>Follow processes as they unfold instead of inferring dynamics from fixed endpoints.</p></article>
        <article class="tile"><h3 class="h-card">Perturb with precision</h3><p>Connect observation to mechanism through controlled changes in molecular state, location and timing.</p></article>
        <article class="tile"><h3 class="h-card">Integrate across scales</h3><p>Relate molecular events to subcellular organisation, cellular behaviour and system-level responses.</p></article>
      </div>
    </div>
  </section>`,
});

/* --- Technologies --- */
pages.push({
  key: 'tech', path: '/technologies/', file: 'technologies/index.html',
  title: 'Technologies | Liu Lab',
  desc: 'An integrated platform combining molecular design, advanced imaging and computation to capture dynamic biological states.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Technologies</p>
      <h1 class="h-page">An integrated platform for quantitative living biology.</h1>
      <p class="lead">We combine molecular design, advanced imaging and computation to capture dynamic biological states and connect measurement to mechanism.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Core capabilities</p>
        <h2 class="h-section">Technologies designed to work together</h2>
        <p class="lead">Each capability addresses a different limit of observation. Their integration enables measurements that are spatially resolved, time-sensitive, molecularly specific and quantitative.</p>
      </div>
      <div class="grid" style="--cols:3">
        <article class="tile"><h3 class="h-card">Molecular design</h3><p>Functional probes, biosensors and engineered tools that report biological states.</p></article>
        <article class="tile"><h3 class="h-card">Advanced imaging</h3><p>Live and quantitative imaging strategies for resolving dynamic processes across scales.</p></article>
        <article class="tile"><h3 class="h-card">AI &amp; computation</h3><p>Analysis, feature extraction and modelling that turn complex image data into biological insight.</p></article>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Integrated pipeline</p>
        <h2 class="h-section">From measurement design to mechanism</h2>
        <p class="lead">The platform is described at the level of scientific capability; specific unpublished implementations remain confidential.</p>
      </div>
      <ol class="flow">
        <li><span class="flow__n">01</span><b>Molecular design</b><p>Define the biological state to measure.</p></li>
        <li><span class="flow__n">02</span><b>Advanced imaging</b><p>Observe that state in living systems.</p></li>
        <li><span class="flow__n">03</span><b>AI &amp; computation</b><p>Extract patterns and model transitions.</p></li>
        <li><span class="flow__n">04</span><b>Biological insight</b><p>Test mechanisms in relevant systems.</p></li>
      </ol>
    </div>
  </section>`,
});

/* --- Open Science (resources grouped by category) --- */
const resourceGroups = (() => {
  const groups = {};
  for (const r of resources) (groups[r.category] ||= []).push(r);
  return groups;
})();

pages.push({
  key: 'open', path: '/open-science/', file: 'open-science/index.html',
  title: 'Open Science | Liu Lab',
  desc: 'Open-source software from Liu Lab, plus the imaging, molecular biology and community resources we rely on.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Open Science</p>
      <h1 class="h-page">Sharing tools to accelerate discovery.</h1>
      <p class="lead">Modern biology advances faster when technologies, computational tools and molecular resources become reusable by the community.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Release principles</p>
        <h2 class="h-section">Useful, documented and responsible</h2>
      </div>
      <div class="grid" style="--cols:3">
        <article class="tile"><h3 class="h-card">Validate</h3><p>Confirm performance and define the intended scope before public release.</p></article>
        <article class="tile"><h3 class="h-card">Document</h3><p>Provide protocols, examples, dependencies and practical guidance for reuse.</p></article>
        <article class="tile"><h3 class="h-card">Share</h3><p>Connect published resources to stable repositories and community channels.</p></article>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Reference desk</p>
        <h2 class="h-section">Tools we rely on</h2>
        <p class="lead">Our own code, plus the resources we point new lab members to. Most are maintained by the wider community, not by us.</p>
      </div>
      <div class="grid" style="--cols:${Math.min(Object.keys(resourceGroups).length, 4)}">
        ${Object.entries(resourceGroups).map(([cat, rows]) => `<article class="tile">
          <h3 class="h-card">${esc(cat)}</h3>
          <div class="res-group">${rows.map((r) => `<div class="res"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span>${esc(r.note)}</span></div>`).join('')}</div>
        </article>`).join('')}
      </div>
      <p class="res-note">Need a plasmid, a protocol, or help with a biosensor or optogenetic tool? Email <a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a>.</p>
    </div>
  </section>`,
});

/* --- Publications (grouped by year) --- */
const pubYears = publications.map((p) => Number(p.year)).filter(Boolean);
const pubGroups = [];
for (const p of publications) {
  const last = pubGroups[pubGroups.length - 1];
  if (last && last.year === p.year) last.items.push(p);
  else pubGroups.push({ year: p.year, items: [p] });
}

pages.push({
  key: 'pubs', path: '/publications/', file: 'publications/index.html',
  title: 'Publications | Liu Lab',
  desc: 'Published work from Liu Lab and collaborators, spanning biosensors, optogenetics, advanced microscopy, computation and quantitative cell biology.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Publications</p>
      <h1 class="h-page">Published work from Liu Lab and collaborators.</h1>
      <p class="lead">Research spanning molecular biosensors, optogenetics, advanced microscopy, computation and quantitative cell biology.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <p class="pub-summary meta">${publications.length} publications · ${Math.min(...pubYears)}–${Math.max(...pubYears)}</p>
      <div class="pub-list">
        ${pubGroups.map((g) => `
        <section class="pub-year">
          <h2 class="pub-year__label">${esc(g.year)}</h2>
          ${g.items.map(pubEntry).join('')}
        </section>`).join('')}
      </div>
    </div>
  </section>`,
});

/* --- People --- */
const pi = team[0];
const members = team.slice(1);

pages.push({
  key: 'people', path: '/people/', file: 'people/index.html',
  title: 'People | Liu Lab',
  desc: 'The Liu Lab team at the College of Future Technology and National Biomedical Imaging Center, Peking University.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">People</p>
      <h1 class="h-page">A collaborative team at the interface of biology, engineering and computation.</h1>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="pi">
        <img src="${esc(pi.photo)}" alt="${esc(pi.nameEn)}" />
        <div class="pi__body">
          <p class="pi__zh">${esc(pi.nameZh)}</p>
          <h2 class="h-section" style="font-size:clamp(1.9rem,3.2vw,2.6rem)">${esc(pi.nameEn)}, Ph.D.</h2>
          <p class="meta">${esc(pi.role)}</p>
          <p class="body">${esc(pi.bio)}</p>
          <p class="meta"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Current members</p>
        <h2 class="h-section">Our team</h2>
      </div>
      <div class="people">
        ${members.map((m) => `
        <article class="person">
          <img src="${esc(m.photo)}" alt="${esc(m.nameEn)}" loading="lazy" />
          <div class="person__body">
            <h3 class="person__name">${esc(m.nameZh)}</h3>
            <p class="person__en">${esc(m.nameEn)}</p>
            <p class="person__role">${esc(m.role)}</p>
            <p>${esc(m.bio)}</p>
          </div>
        </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Alumni</p>
        <h2 class="h-section">Former lab members</h2>
      </div>
      <div class="alumni">
        ${alumni.map((a) => `
        <article class="alumnus">
          <img src="${esc(a.photo)}" alt="" loading="lazy" />
          <div><b>${esc(a.nameZh || a.nameEn)}</b><span class="meta">${esc(a.years)}</span></div>
        </article>`).join('')}
      </div>
    </div>
  </section>`,
});

/* --- Join Us --- */
pages.push({
  key: 'join', path: '/join-us/', file: 'join-us/index.html',
  title: 'Join Us | Liu Lab',
  desc: 'Openings at Liu Lab for postdoctoral fellows, a research assistant, PhD students and undergraduate researchers.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">Join Liu Lab</p>
      <h1 class="h-page">Build new ways to see living systems.</h1>
      <p class="lead">We welcome researchers who want to connect molecular engineering, advanced imaging, computation and quantitative biology.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Postdoctoral fellows</p>
        <h2 class="h-section">Three research directions</h2>
        <p class="lead">Long-term openings for researchers who have completed, or are nearing completion of, a PhD.</p>
      </div>
      <div class="grid" style="--cols:3">
        <article class="tile"><h3 class="h-card">Molecular probes &amp; optogenetic tools</h3><p>For researchers trained in molecular or cell biology. Experience in biosensor design, optogenetics, directed evolution, CRISPR-based screening or organoids is especially relevant.</p></article>
        <article class="tile"><h3 class="h-card">Multimodal imaging systems</h3><p>For researchers with training in optical systems. Experience developing single-molecule, light-sheet, fluorescence-lifetime or structured-illumination imaging is especially relevant.</p></article>
        <article class="tile"><h3 class="h-card">Omics &amp; spatial omics</h3><p>For researchers working in single-cell spatial proteomics, metabolomics or transcriptomics who are interested in integrating these with optical imaging.</p></article>
      </div>
      <p class="body" style="margin-top:26px">Appointments follow Peking University postdoctoral standards and include applicable social insurance and housing support. The lab supports applications to the Boya Postdoctoral Fellowship and provides performance-based incentives.</p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Research assistant</p>
        <h2 class="h-section">Support the lab. Grow as a researcher.</h2>
        <p class="lead">This role combines laboratory coordination with opportunities to join experiments and, where appropriate, lead subprojects.</p>
      </div>
      <div class="grid" style="--cols:2">
        <article class="tile"><h3 class="h-card">Responsibilities</h3><ul class="ticks"><li>Support purchasing, equipment maintenance, reimbursement and laboratory safety.</li><li>Assist with grant applications, financial coordination and project completion.</li><li>Participate in experimental work and contribute to publications.</li></ul></article>
        <article class="tile"><h3 class="h-card">Background</h3><ul class="ticks"><li>Bachelor's degree or above.</li><li>Experience in molecular biology, cell biology, protein purification, western blotting or co-immunoprecipitation.</li><li>Imaging, image analysis, optical engineering or laboratory automation experience is welcome.</li></ul></article>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="grid" style="--cols:2">
        <article class="tile"><h3 class="h-card">PhD students</h3><p>Recruitment follows the College of Future Technology summer-camp and admissions process. Prospective students should consult the college's current announcements for dates and requirements.</p></article>
        <article class="tile"><h3 class="h-card">Undergraduates</h3><p>Students in biology, chemistry, physics, engineering, computation and related fields are welcome to contact the lab about research training.</p></article>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="band">
        <div>
          <p class="eyebrow">How to apply</p>
          <h2 class="h-section">Tell us what you want to discover.</h2>
          <p class="lead">Email your materials with the subject line <em>Name + Graduating Institution + Major + Position</em>.</p>
          <ul class="ticks" style="margin-top:16px">
            <li>Curriculum vitae</li>
            <li>Cover letter, including your career plan</li>
            <li>Recommendation letters — at least three for postdoctoral applicants, at least one for research assistants</li>
          </ul>
        </div>
        <div>
          <div class="btns"><a class="btn btn--primary" href="mailto:beiliu@pku.edu.cn">Email the lab</a></div>
          <p class="meta" style="margin-top:14px">beiliu[AT]pku.edu.cn</p>
        </div>
      </div>
    </div>
  </section>`,
});

/* --- News index --- */
pages.push({
  key: 'news', path: '/news/', file: 'news/index.html',
  title: 'News | Liu Lab',
  desc: 'Lab life, milestones and updates from Liu Lab at Peking University.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">News</p>
      <h1 class="h-page">From the lab.</h1>
      <p class="lead">Trips, milestones, new instruments and the occasional hotpot.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap"><div class="posts">${posts.map(postCard).join('')}</div></div>
  </section>`,
});

/* --- One page per news post --- */
for (const p of posts) {
  pages.push({
    key: 'news', path: `/news/${p.slug}/`, file: `news/${p.slug}/index.html`,
    title: `${p.title} | Liu Lab`,
    desc: p.excerpt || `${p.title} — Liu Lab news.`,
    body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow"><a href="/news/">News</a></p>
      <h1 class="h-page">${esc(p.title)}</h1>
      <p class="meta">${esc(formatDate(p.date))}</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap post-article">
      ${p.cover ? `<figure class="post-fig post-fig--lead"><img src="${esc(p.cover)}" alt="" /></figure>` : ''}
      ${markdown(p.body, { skipImage: p.cover })}
      <p style="margin-top:36px"><a class="btn" href="/news/">← All news</a></p>
    </div>
  </section>`,
  });
}

/* ---------------- emit ---------------- */

for (const p of pages) {
  const target = join(OUT, p.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, shell(p), 'utf8');
  console.log(`  ${p.file.padEnd(40)} ${p.path}`);
}

writeFileSync(join(OUT, 'CNAME'), 'www.liubeilab.com\n', 'utf8');
writeFileSync(join(OUT, '.nojekyll'), '', 'utf8');

const SITE = 'https://www.liubeilab.com';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><changefreq>${p.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p.path === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), sitemap, 'utf8');

writeFileSync(join(OUT, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`, 'utf8');

writeFileSync(join(OUT, '404.html'), shell({
  key: '', path: '/404.html',
  title: 'Page not found | Liu Lab',
  desc: 'That page does not exist.',
  body: `
  <section class="page-hero">
    <div class="wrap">
      <p class="eyebrow">404</p>
      <h1 class="h-page">That page isn't here.</h1>
      <p class="lead">The link may be out of date. The sections below cover everything on the site.</p>
      <div class="btns" style="margin-top:26px">
        <a class="btn btn--primary" href="/">Back to home</a>
        <a class="btn" href="/publications/">Publications</a>
        <a class="btn" href="/people/">People</a>
      </div>
    </div>
  </section>`,
}), 'utf8');

console.log(`\n${pages.length} pages (incl. ${posts.length} news posts) + 404, sitemap.xml, robots.txt, .nojekyll written.`);
console.log('CNAME: www.liubeilab.com');
