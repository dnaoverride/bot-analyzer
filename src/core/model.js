import {getAdapter} from '../adapters/index.js';
import {normalizeText} from './text.js';
export const SCHEMA_VERSION=1;
export function emptyState(){return {schemaVersion:SCHEMA_VERSION,records:[],reviews:{},settings:{nearText:true,imageThreshold:5}};}
function bounded(value,max){return typeof value==='string'?value.slice(0,max):'';}
export function validateRecord(raw) {
  if(!raw||typeof raw!=='object')throw Error('Neispravan unos.');
  const platform=raw.platform||'tiktok',adapter=getAdapter(platform);
  const profile=adapter.canonicalProfile(raw.profile||''); if(!profile)throw Error('Neispravan link profila.');
  const postUrl=adapter.validPost(raw.postUrl??raw.video??'');if(postUrl===null)throw Error('Neispravan link objave.');
  const text=bounded(raw.text??raw.comment,5000), note=bounded(raw.note,3000);
  let avatar=null;
  if(raw.avatar){const a=raw.avatar;if(!/^[0-9a-f]{16}$/.test(a.dhash)||!/^[0-9a-f]{16}$/.test(a.ahash)||!Number.isFinite(a.contrast)||a.contrast<0||a.contrast>255||typeof a.thumb!=='string'||a.thumb.length>60000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.thumb))throw Error('Neispravan otisak slike.');avatar={dhash:a.dhash,ahash:a.ahash,contrast:a.contrast,thumb:a.thumb};}
  if(!text.trim()&&!avatar)throw Error('Dodaj komentar ili profilnu sliku.');
  const observedAt=typeof raw.observedAt==='string'&&Number.isFinite(Date.parse(raw.observedAt))?new Date(raw.observedAt).toISOString():new Date().toISOString();
  return {id:typeof raw.id==='string'&&/^[\w-]{1,100}$/.test(raw.id)?raw.id:crypto.randomUUID(),platform,profile,handle:adapter.handle(profile),postUrl,text,note,avatar,observedAt,source:['manual','visible-dom','import'].includes(raw.source)?raw.source:'import',commentId:bounded(raw.commentId,100)};
}
export function recordKey(r){return JSON.stringify([r.platform,r.profile.toLowerCase(),r.postUrl,normalizeText(r.text),r.avatar?.dhash||'']);}
export function mergeRecords(existing,incoming){const records=[...existing],keys=new Set(existing.map(recordKey)),ids=new Set(existing.map(r=>r.id));let added=0;for(const value of incoming){const r=validateRecord(value),key=recordKey(r);if(keys.has(key))continue;if(ids.has(r.id))r.id=crypto.randomUUID();if(records.length>=2000)throw Error('Najviše 2.000 sačuvanih primera; podeli istraživanje u manje skupove.');records.push(r);keys.add(key);ids.add(r.id);added++;}return {records,added};}
export function importState(input){
  // Old standalone app backups: [] or {version:2,items:[...]}. Old dHash-only avatars are not reused.
  let records,legacy=false;
  if(Array.isArray(input)){records=input;legacy=true;}else if(Array.isArray(input?.items)){records=input.items;legacy=true;}
  else if(input?.schemaVersion===SCHEMA_VERSION&&Array.isArray(input.records))records=input.records;
  else throw Error('Nepodržan JSON format.');
  if(records.length>10000)throw Error('Najviše 10.000 unosa po uvozu.');
  const accepted=[],errors=[];
  for(let i=0;i<records.length;i++){try{const raw=records[i];if(legacy&&!raw.comment?.trim()){errors.push(`Red ${i+1}: stari unos sadrži samo sliku; dodaj sliku ponovo.`);continue;}accepted.push(validateRecord(legacy?{...raw,observedAt:undefined,source:'import'}:raw));}catch(e){errors.push(`Red ${i+1}: ${e.message}`);}}
  return {records:mergeRecords([],accepted).records,errors,legacy};
}
