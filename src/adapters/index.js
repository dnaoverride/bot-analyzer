import {tiktok} from './tiktok.js';
import {instagram} from './instagram.js';

const registry = new Map([[tiktok.id, tiktok], [instagram.id, instagram]]);

export function getAdapter(id) {
  const adapter = registry.get(id);
  if (!adapter) throw Error('Nepodržana mreža: ' + id);
  return adapter;
}

export function listAdapters() {
  return [...registry.values()];
}

export function getAdapterForHost(hostname) {
  const host = String(hostname).toLowerCase();
  for (const adapter of registry.values()) {
    if (adapter.supportedHosts?.includes(host)) return adapter;
  }
  return null;
}

function hasAdapterContract(adapter) {
  return adapter?.id
    && typeof adapter.canonicalProfile === 'function'
    && typeof adapter.handle === 'function'
    && (typeof adapter.validPost === 'function' || typeof adapter.canonicalPost === 'function')
    && adapter.reporting;
}

export function registerAdapter(adapter) {
  if (!hasAdapterContract(adapter)) throw Error('Adapter nema potreban interfejs.');
  if (registry.has(adapter.id)) throw Error('Adapter već postoji.');
  registry.set(adapter.id, adapter);
}
