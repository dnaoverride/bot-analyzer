const CYRILLIC = {а:'a',б:'b',в:'v',г:'g',д:'d',ђ:'dj',е:'e',ж:'z',з:'z',и:'i',ј:'j',к:'k',л:'l',љ:'lj',м:'m',н:'n',њ:'nj',о:'o',п:'p',р:'r',с:'s',т:'t',ћ:'c',у:'u',ф:'f',х:'h',ц:'c',ч:'c',џ:'dz',ш:'s'};
export function normalizeText(text) {
  return [...String(text).normalize('NFKC').toLowerCase()].map(c=>CYRILLIC[c]??c).join('')
    .replaceAll('đ','dj').normalize('NFD').replace(/\p{M}/gu,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
export function tokens(text) { return new Set(normalizeText(text).split(' ').filter(Boolean)); }
export function jaccard(a,b) { const left=tokens(a),right=tokens(b); if(!left.size||!right.size)return 0; let n=0; for(const t of left)if(right.has(t))n++; return n/(left.size+right.size-n); }
export function usernameStem(handle) {const stem=String(handle).toLowerCase().replace(/\d+$/,'').replace(/[._]+$/,''); return stem.replace(/[._]/g,'').length>=5 ? stem : null;}
