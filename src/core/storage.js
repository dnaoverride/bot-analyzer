import {emptyState,importState} from './model.js';
const KEY='bot-analyzer-state-v1';
export const extensionMode=!!globalThis.chrome?.storage?.local;
export async function loadState(){try{const raw=extensionMode?(await chrome.storage.local.get(KEY))[KEY]:JSON.parse(localStorage.getItem(KEY)||'null');if(!raw)return emptyState();const imported=importState(raw);if(imported.errors.length)throw Error('Neki sačuvani unosi nisu ispravni.');const reviews=Object.fromEntries(Object.entries(raw.reviews||{}).filter(([key,value])=>typeof key==='string'&&['pending','include','dismiss'].includes(value)));const settings={nearText:raw.settings?.nearText!==false,imageThreshold:5};return {...emptyState(),records:imported.records,reviews,settings};}catch(e){throw Error('Ne mogu da učitam podatke: '+e.message);}}
export async function saveState(state){if(extensionMode)await chrome.storage.local.set({[KEY]:state});else localStorage.setItem(KEY,JSON.stringify(state));}
export async function takeCapture(){if(!extensionMode)return null;const {captureBatch}=await chrome.storage.local.get('captureBatch');return captureBatch||null;}
export async function clearCapture(id){if(extensionMode){const {captureBatch}=await chrome.storage.local.get('captureBatch');if(captureBatch?.id===id)await chrome.storage.local.remove('captureBatch');}}
