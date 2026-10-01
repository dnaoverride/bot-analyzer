import {normalizeText,tokens,jaccard,usernameStem} from './text.js';
import {compareAvatars} from './image.js';
export function analyze(records,settings={}) {
  const groups=[],byText=new Map();
  for(const r of records){const text=normalizeText(r.text);if(text.length<16||tokens(text).size<4)continue;const key=r.platform+'|'+text;if(!byText.has(key))byText.set(key,[]);byText.get(key).push(r);}
  for(const [key,list] of byText){const profiles=new Set(list.map(r=>r.profile.toLowerCase()));if(profiles.size>=3)groups.push({id:'text:'+key,kind:'repeated-text',title:'Ista poruka na više naloga',explanation:`${profiles.size} različitih profila; ${list.length} sačuvanih primera. Moguća je i organska upotreba istog citata ili slogana.`,recordIds:list.map(r=>r.id),platform:list[0].platform});}
  // Combine independent clues for pairs; they are review priorities, never probabilities.
  const pairs=[],byProfile=new Map();for(const r of records){const key=r.platform+'|'+r.profile.toLowerCase();if(!byProfile.has(key))byProfile.set(key,[]);byProfile.get(key).push(r);}
  const accounts=[...byProfile.values()];
  if(accounts.length>500)return {groups,pairs,warnings:['Poređenje parova je ograničeno na 500 različitih profila. Smanji skup podataka; grupe identičnog teksta su i dalje prikazane.']};
  for(let i=0;i<accounts.length;i++)for(let j=i+1;j<accounts.length;j++){
    const left=accounts[i],right=accounts[j],a=left[0],b=right[0];if(a.platform!==b.platform)continue;const signals=[];let evidence=[a.id,b.id];
    let textMatch=null;for(const x of left)for(const y of right){const nx=normalizeText(x.text),ny=normalizeText(y.text);if(nx.length<16||ny.length<16||tokens(nx).size<4||tokens(ny).size<4)continue;const exact=nx===ny,similarity=exact?1:(settings.nearText!==false&&tokens(nx).size>=6&&tokens(ny).size>=6?jaccard(nx,ny):0);if(similarity>=.9&&(!textMatch||similarity>textMatch.similarity))textMatch={exact,similarity,x,y};}
    if(textMatch){signals.push({type:'text',label:textMatch.exact?'Ista normalizovana poruka':'Veoma sličan skup reči',detail:'Tekst može biti citat, slogan ili prepisana poruka; poređenje ne dokazuje automatizaciju.'});evidence.push(textMatch.x.id,textMatch.y.id);}
    const stemA=usernameStem(a.handle),stemB=usernameStem(b.handle);if(stemA&&stemA===stemB&&a.handle.toLowerCase()!==b.handle.toLowerCase())signals.push({type:'username',label:'Isto ime uz drugačiji brojčani nastavak',detail:`@${a.handle} / @${b.handle}. Samo po sebi slab signal.`});
    let imageMatch=null;for(const x of left)for(const y of right){const match=compareAvatars(x.avatar,y.avatar,settings.imageThreshold??5);if(match&&(!imageMatch||match.distance<imageMatch.distance))imageMatch={...match,x,y};}
    if(imageMatch){signals.push({type:'avatar',label:'Moguće poklapanje profilnih slika',detail:`Razlika otisaka: ${imageMatch.distance}/64. Potrebna je vizuelna provera; popularne slike mogu koristiti nepovezani nalozi.`});evidence.push(imageMatch.x.id,imageMatch.y.id);}
    if(signals.length)pairs.push({id:'pair:'+JSON.stringify([a.platform,...[a.profile.toLowerCase(),b.profile.toLowerCase()].sort()]),kind:'account-pair',platform:a.platform,title:'@'+a.handle+' ↔ @'+b.handle,profiles:[a.profile,b.profile],signals,priority:signals.length>=2?'multiple':'single',recordIds:[...new Set(evidence)]});
  }
  pairs.sort((a,b)=>b.signals.length-a.signals.length);const warnings=pairs.length>250?[`Prikazano je prvih 250 od ${pairs.length} parova, sa prioritetom za više tragova. Smanji skup za ostale parove.`]:[];return {groups,pairs:pairs.slice(0,250),warnings};
}
