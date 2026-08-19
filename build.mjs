/* Builds the eight static pages from one shell + per-page bodies.
   Header and footer stay in the emitted HTML (not injected by JS) so crawlers
   see real markup and each route keeps its own URL. Run: node build.mjs */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Output lands beside this script: the repo root is the published site. */
const OUT = dirname(fileURLToPath(import.meta.url));

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

const shell = ({ key, path, title, desc, body, script = '', heroCss = '' }) => `<!doctype html>
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
      <p class="meta" style="margin-top:10px"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a> · <a href="https://github.com/drbeiliu" target="_blank" rel="noopener">GitHub</a></p>
    </div>
    <div class="affil" style="border-top:0;margin-top:0;padding-top:0">
      <img class="affil__mark affil__mark--invert" src="/assets/img/pku.png" alt="Peking University" />
      <img class="affil__mark affil__mark--invert" src="/assets/img/cft.png" alt="College of Future Technology, Peking University" />
      <img class="affil__mark" src="/assets/img/nbic.png" alt="National Biomedical Imaging Center" />
    </div>
  </div>
</footer>

<script src="/assets/nav.js"></script>
${script}
</body>
</html>
`;

/* ---------------- page bodies ---------------- */

const pages = [];

/* --- Home: deliberately short. Four sections, no long-form copy. --- */
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
        <div id="latest-pub" data-loading></div>
        <p style="margin-top:22px"><a class="btn" href="/publications/">All publications</a></p>
      </div>
      <div>
        <p class="eyebrow">From the lab</p>
        <div id="latest-post" data-loading></div>
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
  script: `<script type="module">
import { getPublications, getPosts, hydrate, formatDate, esc } from '/assets/wix.js';
hydrate(document.getElementById('latest-pub'),
  async () => (await getPublications()).filter(p => p.featured).slice(0, 1),
  ([p]) => \`<h3 class="pub__title" style="font-size:1.34rem">\${esc(p.title)}</h3>
    <p class="pub__authors" style="margin-top:8px">\${esc(p.authors)}</p>
    <p class="pub__journal">\${esc(p.journal)}</p>
    \${p.doi ? \`<a class="pub__doi" href="https://doi.org/\${esc(p.doi)}" target="_blank" rel="noopener">\${esc(p.doi)}</a>\` : ''}\`);
hydrate(document.getElementById('latest-post'),
  async () => (await getPosts(4)).slice(0, 1),
  ([p]) => \`<p class="meta">\${esc(formatDate(p.date))}</p>
    <h3 class="pub__title" style="font-size:1.34rem;margin-top:8px">\${esc(p.title)}</h3>
    \${p.excerpt ? \`<p class="body" style="margin-top:8px">\${esc(p.excerpt)}</p>\` : ''}
    <a class="pub__doi" href="\${esc(p.url)}" target="_blank" rel="noopener">Read the post</a>\`);
</script>`,
});

/* --- Vision / Research: the detail that used to crowd the home page --- */
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

/* --- Open Science (resources from CMS) --- */
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
      <div id="resources" data-loading></div>
      <p class="res-note">Need a plasmid, a protocol, or help with a biosensor or optogenetic tool? Email <a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a>.</p>
    </div>
  </section>`,
  script: `<script type="module">
import { getResources, hydrate, esc } from '/assets/wix.js';
hydrate(document.getElementById('resources'), getResources, items => {
  const groups = {};
  for (const r of items) (groups[r.category] ||= []).push(r);
  return '<div class="grid" style="--cols:' + Math.min(Object.keys(groups).length, 4) + '">' +
    Object.entries(groups).map(([cat, rows]) => \`<article class="tile">
      <h3 class="h-card">\${esc(cat)}</h3>
      <div class="res-group">\${rows.map(r => \`<div class="res"><a href="\${esc(r.url)}" target="_blank" rel="noopener">\${esc(r.name)}</a><span>\${esc(r.note)}</span></div>\`).join('')}</div>
    </article>\`).join('') + '</div>';
});
</script>`,
});

/* --- Publications (from CMS) --- */
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
      <p class="pub-summary meta" id="pub-summary"></p>
      <div class="pub-list" id="pubs" data-loading></div>
    </div>
  </section>`,
  script: `<script type="module">
import { getPublications, hydrate, esc } from '/assets/wix.js';
const entry = p => \`
  <article class="pub"\${p.featured ? ' data-featured' : ''}>
    <div class="pub__n">\${esc(p.idx)}</div>
    <div>
      <h3 class="pub__title">\${esc(p.title)}</h3>
      <p class="pub__authors">\${esc(p.authors)}</p>
      <p class="pub__journal">\${esc(p.journal)}</p>
      \${p.doi ? \`<a class="pub__doi" href="https://doi.org/\${esc(p.doi)}" target="_blank" rel="noopener">\${esc(p.doi)}</a>\` : ''}
    </div>
  </article>\`;

hydrate(document.getElementById('pubs'), getPublications, pubs => {
  const summary = document.getElementById('pub-summary');
  if (summary && pubs.length) {
    const years = pubs.map(p => Number(p.year)).filter(Boolean);
    summary.textContent = pubs.length + ' publications · ' + Math.min(...years) + '–' + Math.max(...years);
  }
  // group consecutively: the list already arrives sorted newest first
  const groups = [];
  for (const p of pubs) {
    const last = groups[groups.length - 1];
    if (last && last.year === p.year) last.items.push(p);
    else groups.push({ year: p.year, items: [p] });
  }
  return groups.map(g => \`
    <section class="pub-year">
      <h2 class="pub-year__label">\${esc(g.year)}</h2>
      \${g.items.map(entry).join('')}
    </section>\`).join('');
});
</script>`,
});

/* --- People (from CMS) --- */
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
    <div class="wrap"><div id="pi" data-loading></div></div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Current members</p>
        <h2 class="h-section">Our team</h2>
      </div>
      <div class="people" id="members" data-loading></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section__head">
        <p class="eyebrow">Alumni</p>
        <h2 class="h-section">Former lab members</h2>
      </div>
      <div class="alumni" id="alumni" data-loading></div>
    </div>
  </section>`,
  script: `<script type="module">
import { getTeam, getAlumni, hydrate, wixImage, esc } from '/assets/wix.js';
hydrate(document.getElementById('pi'), async () => (await getTeam()).slice(0, 1), ([p]) => \`
  <div class="pi">
    <img src="\${esc(wixImage(p.photo, 560, 700))}" alt="\${esc(p.nameEn)}" />
    <div class="pi__body">
      <p class="pi__zh">\${esc(p.nameZh)}</p>
      <h2 class="h-section" style="font-size:clamp(1.9rem,3.2vw,2.6rem)">\${esc(p.nameEn)}, Ph.D.</h2>
      <p class="meta">\${esc(p.role)}</p>
      <p class="body">\${esc(p.bio)}</p>
      <p class="meta"><a href="mailto:beiliu@pku.edu.cn">beiliu[AT]pku.edu.cn</a></p>
    </div>
  </div>\`);
hydrate(document.getElementById('members'), async () => (await getTeam()).slice(1), rows => rows.map(m => \`
  <article class="person">
    <img src="\${esc(wixImage(m.photo, 620, 465))}" alt="\${esc(m.nameEn)}" loading="lazy" />
    <div class="person__body">
      <h3 class="person__name">\${esc(m.nameZh)}</h3>
      <p class="person__en">\${esc(m.nameEn)}</p>
      <p class="person__role">\${esc(m.role)}</p>
      <p>\${esc(m.bio)}</p>
    </div>
  </article>\`).join(''));
hydrate(document.getElementById('alumni'), getAlumni, rows => rows.map(a => \`
  <article class="alumnus">
    <img src="\${esc(wixImage(a.photo, 200, 200))}" alt="" loading="lazy" />
    <div><b>\${esc(a.nameZh)}</b><span class="meta">\${esc(a.years)}</span></div>
  </article>\`).join(''));
</script>`,
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
      <p class="meta">Listings published April 2024</p>
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

/* --- News (live Wix Blog) --- */
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
    <div class="wrap"><div class="posts" id="posts" data-loading></div></div>
  </section>`,
  script: `<script type="module">
import { getPosts, hydrate, wixImage, formatDate, esc } from '/assets/wix.js';
hydrate(document.getElementById('posts'), () => getPosts(50), posts => posts.map(p => \`
  <a class="post" href="\${esc(p.url)}" target="_blank" rel="noopener">
    \${p.cover ? \`<img src="\${esc(wixImage(p.cover, 720, 450))}" alt="" loading="lazy" />\` : ''}
    <div class="post__body">
      <p class="meta">\${esc(formatDate(p.date))}</p>
      <h2 class="post__title">\${esc(p.title)}</h2>
      \${p.excerpt ? \`<p>\${esc(p.excerpt)}</p>\` : ''}
    </div>
  </a>\`).join(''));
</script>`,
});

/* ---------------- emit ---------------- */

for (const p of pages) {
  const target = join(OUT, p.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, shell(p), 'utf8');
  console.log(`  ${p.file.padEnd(28)} ${p.path}`);
}
/* No CNAME yet. Committing one makes GitHub Pages switch to the custom domain
   immediately, and the site then 404s until DNS is pointed — which would block
   review. It gets added at cutover, not before. */
writeFileSync(join(OUT, '.nojekyll'), '', 'utf8');

/* Sitemap + robots. The canonical host is the Wix domain this site is about to
   take over, so both are written against www.liubeilab.com regardless of where
   the files are currently served from. */
const SITE = 'https://www.liubeilab.com';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${SITE}${p.path}</loc><changefreq>${p.path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p.path === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), sitemap, 'utf8');

writeFileSync(join(OUT, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`, 'utf8');

/* A 404 that keeps the reader inside the site rather than dumping them on
   GitHub's default page. */
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

console.log(`\n${pages.length} pages + 404, sitemap.xml, robots.txt, .nojekyll written.`);
console.log('CNAME deliberately omitted until the domain cutover.');


