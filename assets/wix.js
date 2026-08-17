/* Liu Lab — Wix data layer.
   Talks to the lab's existing Wix site directly from the browser using the public
   headless client id. No SDK, no build step, no backend. Every call is read-only. */

const WIX_CLIENT_ID = 'f55acf50-9fb2-4971-b86d-4a56b2875f81';
const WIX_API = 'https://www.wixapis.com';
const TOKEN_KEY = 'wix_visitor_token_v1';

/* Visitor tokens last 4h; cache in sessionStorage so a click-through of the site
   costs one token call, not one per page. */
async function visitorToken() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  } catch { /* corrupt cache — fall through and re-mint */ }

  const res = await fetch(`${WIX_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: WIX_CLIENT_ID, grantType: 'anonymous' }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = await res.json();
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 120) * 1000,
    }));
  } catch { /* private mode — just don't cache */ }
  return data.access_token;
}

async function wixFetch(path, options = {}) {
  const token = await visitorToken();
  const res = await fetch(`${WIX_API}${path}`, {
    ...options,
    headers: { 'Authorization': token, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

/* ---- collections ---- */

export async function queryCollection(collectionId, { sort = [], limit = 200 } = {}) {
  const body = JSON.stringify({ dataCollectionId: collectionId, query: { paging: { limit }, sort } });
  const data = await wixFetch('/wix-data/v2/items/query', { method: 'POST', body });
  return (data.dataItems || []).map(i => i.data);
}

export const getPublications = () => queryCollection('Publications', { sort: [{ fieldName: 'idx', order: 'DESC' }] });
export const getTeam        = () => queryCollection('TeamMembers', { sort: [{ fieldName: 'sortOrder', order: 'ASC' }] });
export const getAlumni      = () => queryCollection('Alumni',      { sort: [{ fieldName: 'sortOrder', order: 'ASC' }] });
export const getResources   = () => queryCollection('Resources',   { sort: [{ fieldName: 'sortOrder', order: 'ASC' }] });

/* ---- blog (the lab activity posts) ---- */

export async function getPosts(limit = 30) {
  const data = await wixFetch(`/blog/v3/posts?paging.limit=${limit}&fieldsets=URL`, { method: 'GET' });
  return (data.posts || [])
    .filter(p => p.firstPublishedDate)
    .sort((a, b) => new Date(b.firstPublishedDate) - new Date(a.firstPublishedDate))
    .map(p => ({
      title: p.title,
      excerpt: p.excerpt || '',
      date: new Date(p.firstPublishedDate),
      url: p.url ? `${p.url.base}${p.url.path}` : '#',
      cover: p.media?.wixMedia?.image?.url || null,
      minutes: p.minutesToRead || null,
    }));
}

/* ---- helpers ---- */

/* Wix media URLs accept a transform segment; ask for the size we actually render
   rather than shipping a 2000px original into a 300px slot. */
export function wixImage(url, w, h, fit = 'fill') {
  if (!url) return null;
  const base = url.split('/v1/')[0];
  return `${base}/v1/${fit}/w_${w},h_${h},al_c,q_82,enc_auto/img.jpg`;
}

export const formatDate = d =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/* Render helper: never let a failed call blank a region. */
export async function hydrate(el, loader, render) {
  if (!el) return;
  try {
    const data = await loader();
    if (!data || data.length === 0) throw new Error('empty');
    el.innerHTML = render(data);
    el.removeAttribute('data-loading');
  } catch (err) {
    console.warn('[liulab] hydrate failed:', err.message);
    el.setAttribute('data-failed', '');
    el.removeAttribute('data-loading');
  }
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
