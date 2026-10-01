import {tiktok} from './tiktok.js';
const registry = new Map([[tiktok.id,tiktok]]);
export function getAdapter(id){const adapter=registry.get(id);if(!adapter)throw Error('Nepodržana mreža: '+id);return adapter;}
export function listAdapters(){return [...registry.values()];}
export function registerAdapter(adapter){if(!adapter?.id||typeof adapter.canonicalProfile!=='function'||typeof adapter.validPost!=='function'||typeof adapter.handle!=='function')throw Error('Adapter nema potreban interfejs.');if(registry.has(adapter.id))throw Error('Adapter već postoji.');registry.set(adapter.id,adapter);}
