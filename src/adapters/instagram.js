const HOSTS = ['instagram.com', 'www.instagram.com'];
const RESERVED = new Set(['accounts', 'direct', 'explore', 'stories', 'reels', 'p', 'reel', 'tv', 'about', 'legal', 'developer']);

function hostOk(hostname) {
  return HOSTS.includes(hostname.toLowerCase());
}

function stripTracking(url) {
  const tracking = ['igsh', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
  for (const key of tracking) url.searchParams.delete(key);
  return url;
}

function usernameFromPath(pathname) {
  const m = pathname.match(/^\/([A-Za-z0-9._]{1,30})(?:\/|$)/);
  if (!m) return null;
  const name = m[1];
  if (RESERVED.has(name.toLowerCase())) return null;
  return name;
}

export const instagram = {
  id: 'instagram',
  name: 'Instagram',
  supportedHosts: HOSTS,
  capabilities: {manualImport: true, visibleComments: false, apiImport: false},
  canonicalProfile(value, explicitPlatform = false) {
    let input = String(value).trim();
    if (/^@[A-Za-z0-9._]{1,30}$/.test(input)) {
      if (!explicitPlatform) return null;
      input = 'https://www.instagram.com/' + input.slice(1) + '/';
    }
    try {
      const u = new URL(input);
      if (u.protocol !== 'https:' || !hostOk(u.hostname)) return null;
      const name = usernameFromPath(u.pathname);
      return name ? 'https://www.instagram.com/' + name + '/' : null;
    } catch { return null; }
  },
  parseProfileIdentity(input, explicitPlatform = false) {
    const profile = this.canonicalProfile(input, explicitPlatform);
    if (!profile) return null;
    const handle = this.handle(profile);
    return {handle, displayName: null, profileUrl: profile, accountKey: 'instagram:' + handle.toLowerCase()};
  },
  handle(profile) {
    const name = usernameFromPath(new URL(profile).pathname);
    return name || '';
  },
  validPost(value) {
    if (!value) return '';
    try {
      const u = stripTracking(new URL(String(value)));
      if (u.protocol !== 'https:' || !hostOk(u.hostname)) return null;
      const post = u.pathname.match(/^\/p\/([A-Za-z0-9_-]+)(?:\/|$)/);
      const reel = u.pathname.match(/^\/reel\/([A-Za-z0-9_-]+)(?:\/|$)/);
      if (!post && !reel) return null;
      u.search = '';
      u.hash = '';
      return u.href;
    } catch { return null; }
  },
  canonicalPost(value) { return this.validPost(value); },
  canonicalCommentUrl(postUrl, commentId) {
    const post = this.validPost(postUrl);
    if (!post || !commentId) return null;
    try {
      const u = new URL(post);
      u.searchParams.set('comment_id', String(commentId).slice(0, 100));
      return u.href;
    } catch { return null; }
  },
  detectPage(url) {
    try {
      const u = new URL(url);
      if (!hostOk(u.hostname)) return null;
      if (u.pathname.match(/^\/p\/[A-Za-z0-9_-]+/)) return 'post';
      if (u.pathname.match(/^\/reel\/[A-Za-z0-9_-]+/)) return 'reel';
      if (usernameFromPath(u.pathname)) return 'profile';
      return 'other';
    } catch { return null; }
  },
  /** Returns comment author handle when input is a profile URL; null for @mentions in text. */
  commentAuthorFromProfile(value) {
    return this.canonicalProfile(value, true);
  },
  /** True when text looks like an @mention, not a profile URL. */
  isMention(text) {
    const t = String(text).trim();
    return /^@[A-Za-z0-9._]{1,30}$/.test(t) && !t.includes('instagram.com');
  },
  reporting: {
    steps: [
      'Otvori komentar ili profil u Instagram aplikaciji ili na webu.',
      'Klikni na tri tačke pored komentara ili profila.',
      'Izaberi Report i odgovarajući razlog (spam, lažni nalog, itd.).',
      'Za više povezanih primera dodaj objašnjenje i screenshotove gde je to moguće.'
    ],
    helpUrl: 'https://help.instagram.com/165828726894770',
    checkedAt: '2026-10-01'
  }
};
