export const tiktok = {
  id: 'tiktok', name: 'TikTok',
  canonicalProfile(value) {
    let input=String(value).trim(); if(/^@[\w.]{1,64}$/.test(input))input='https://www.tiktok.com/'+input;
    try {const u=new URL(input);if(u.protocol!=='https:'||!['tiktok.com','www.tiktok.com','m.tiktok.com'].includes(u.hostname.toLowerCase()))return null;
      const m=u.pathname.match(/^\/@([\w.]{1,64})(?:\/|$)/);return m?'https://www.tiktok.com/@'+m[1]:null;}catch{return null;}
  },
  handle(profile) {return new URL(profile).pathname.slice(2);},
  validPost(value) {
    if(!value)return '';try{const u=new URL(String(value));return u.protocol==='https:'&&['tiktok.com','www.tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com'].includes(u.hostname.toLowerCase())?u.href:null;}catch{return null;}
  },
  reporting: {
    steps: ['Otvori originalni komentar ili profil.', 'Izaberi Report i razlog koji odgovara stvarnom ponašanju.', 'Za povezane primere koristi Settings and privacy → Report a problem kada postoji polje za opis/priloge.'],
    helpUrl: 'https://support.tiktok.com/en/safety-hc/report-a-problem/report-a-user'
  }
};
