// This function is injected as an isolated function; all dependencies must stay inside it.
export function captureTikTokVisible() {
  if(!['tiktok.com','www.tiktok.com','m.tiktok.com'].includes(location.hostname))return {records:[],message:'Otvori TikTok da prikupiš komentare.'};
  const isVisible=element=>{const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth&&style.visibility!=='hidden'&&style.display!=='none';};
  const textNodes=[...document.querySelectorAll('[data-e2e="comment-level-1"], [data-e2e="comment-level-2"], [data-e2e="comment-text"]')];
  const records=[],seen=new Set(),postUrl=location.href,observedAt=new Date().toISOString();
  for(const textNode of textNodes){if(!isVisible(textNode))continue;let container=textNode.closest('[data-e2e="comment-item"], [data-e2e="comment-level-1-item"], [data-e2e="comment-level-2-item"]');
    const authorIn=box=>{
      const explicit=box.querySelector('[data-e2e="comment-username-1"] a[href*="/@"], [data-e2e="comment-username-2"] a[href*="/@"], a[data-e2e*="comment-username"][href*="/@"]');
      if(explicit&&!textNode.contains(explicit))return explicit;
      const candidates=[...box.querySelectorAll('a[href*="/@"]')].filter(a=>!textNode.contains(a));
      const unique=new Map(candidates.map(a=>[a.getAttribute('href'),a]));return unique.size===1?[...unique.values()][0]:null;
    };
    let author=container?authorIn(container):null;
    if(!container){let parent=textNode.parentElement;for(let depth=0;parent&&depth<5;depth++,parent=parent.parentElement){
      const texts=parent.querySelectorAll('[data-e2e="comment-level-1"], [data-e2e="comment-level-2"], [data-e2e="comment-text"]');
      if(texts.length!==1)continue;const candidate=authorIn(parent);if(candidate){container=parent;author=candidate;break;}
    }}
    if(!container)continue;
    if(!author)continue;let u;try{u=new URL(author.getAttribute('href'),location.origin);}catch{continue;}
    if(!['tiktok.com','www.tiktok.com','m.tiktok.com'].includes(u.hostname)||u.protocol!=='https:')continue;const match=u.pathname.match(/^\/@([\w.]{1,64})(?:\/|$)/);if(!match)continue;
    const profile='https://www.tiktok.com/@'+match[1],text=textNode.textContent.trim().slice(0,5000);if(!text)continue;const key=profile+'|'+text;if(seen.has(key))continue;seen.add(key);
    records.push({platform:'tiktok',profile,text,postUrl,observedAt,source:'visible-dom',note:'Eksperimentalno izdvojeno iz vidljivog HTML-a. Proveri da autor i tekst pripadaju istom komentaru.'});if(records.length>=250)break;
  }
  return {records,message:records.length?`Prikupljeno ${records.length} trenutno vidljivih komentara. Proveri autora i tekst pre uvoza.`:'Nema prepoznatih vidljivih komentara. Otvori komentare; ako ih već vidiš, TikTok selektori možda zahtevaju ažuriranje.'};
}
