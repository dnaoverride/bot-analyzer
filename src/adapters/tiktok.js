const HOSTS = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'];
const POST_HOSTS = [...HOSTS, 'vm.tiktok.com', 'vt.tiktok.com'];

function hostOk(hostname, hosts) {
  return hosts.includes(hostname.toLowerCase());
}

export const tiktok = {
  id: 'tiktok',
  name: 'TikTok',
  supportedHosts: HOSTS,
  capabilities: {manualImport: true, visibleComments: true, apiImport: false},
  canonicalProfile(value) {
    let input = String(value).trim();
    if (/^@[\w.]{1,64}$/.test(input)) input = 'https://www.tiktok.com/' + input;
    try {
      const u = new URL(input);
      if (u.protocol !== 'https:' || !hostOk(u.hostname, HOSTS)) return null;
      const m = u.pathname.match(/^\/@([\w.]{1,64})(?:\/|$)/);
      return m ? 'https://www.tiktok.com/@' + m[1] : null;
    } catch { return null; }
  },
  parseProfileIdentity(input) {
    const profile = this.canonicalProfile(input);
    if (!profile) return null;
    const handle = this.handle(profile);
    return {handle, displayName: null, profileUrl: profile, accountKey: 'tiktok:' + handle.toLowerCase()};
  },
  handle(profile) { return new URL(profile).pathname.slice(2); },
  validPost(value) {
    if (!value) return '';
    try {
      const u = new URL(String(value));
      return u.protocol === 'https:' && hostOk(u.hostname, POST_HOSTS) ? u.href : null;
    } catch { return null; }
  },
  canonicalPost(value) { return this.validPost(value); },
  detectPage(url) {
    try {
      const u = new URL(url);
      if (!hostOk(u.hostname, HOSTS)) return null;
      if (/^\/@[\w.]{1,64}(?:\/|$)/.test(u.pathname)) return 'profile';
      if (/\/video\//.test(u.pathname)) return 'post';
      return 'other';
    } catch { return null; }
  },
  reporting: {
    steps: [
      'Otvori originalni komentar ili profil.',
      'Izaberi Report i razlog koji odgovara stvarnom ponašanju.',
      'Za povezane primere koristi Settings and privacy → Report a problem kada postoji polje za opis/priloge.'
    ],
    helpUrl: 'https://support.tiktok.com/en/safety-hc/report-a-problem/report-a-user',
    checkedAt: '2026-10-01'
  }
};
