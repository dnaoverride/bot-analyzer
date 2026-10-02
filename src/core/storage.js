import {emptyState, importState, migrateStateV1, SCHEMA_VERSION} from './model.js';

const KEY = 'bot-analyzer-state-v1';
export const extensionMode = !!globalThis.chrome?.storage?.local;

export function exportStateSnapshot(state) {
  return JSON.stringify(state, null, 2);
}

export async function loadState() {
  try {
    const raw = extensionMode
      ? (await chrome.storage.local.get(KEY))[KEY]
      : JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return emptyState();

    let working = raw;
    let migrationErrors = [];

    if (raw.schemaVersion === 1) {
      const migrated = migrateStateV1(raw);
      migrationErrors = migrated.errors || [];
      working = {
        schemaVersion: SCHEMA_VERSION,
        records: migrated.records,
        reviews: migrated.reviews,
        settings: migrated.settings
      };
    }

    const imported = importState(working);
    if (imported.errors.length) {
      const detail = [...imported.errors, ...migrationErrors].join(' ');
      throw Error('Neki sačuvani unosi nisu ispravni. ' + detail);
    }

    const reviews = Object.fromEntries(
      Object.entries(working.reviews || {}).filter(([key, value]) =>
        typeof key === 'string' && ['pending', 'include', 'dismiss'].includes(value))
    );
    const settings = {nearText: working.settings?.nearText !== false, imageThreshold: 5};
    const state = {...emptyState(), records: imported.records, reviews, settings};

    if (raw.schemaVersion === 1) {
      try {
        await saveState(state);
      } catch (e) {
        throw Error('Migracija nije sačuvana; originalni podaci nisu obrisani. ' + e.message);
      }
    }

    return state;
  } catch (e) {
    throw Error('Ne mogu da učitam podatke: ' + e.message);
  }
}

export async function saveState(state) {
  const payload = {...state, schemaVersion: SCHEMA_VERSION};
  if (extensionMode) await chrome.storage.local.set({[KEY]: payload});
  else localStorage.setItem(KEY, JSON.stringify(payload));
}

export async function takeCapture() {
  if (!extensionMode) return null;
  const {captureBatch} = await chrome.storage.local.get('captureBatch');
  return captureBatch || null;
}

export async function clearCapture(id) {
  if (!extensionMode) return;
  const {captureBatch} = await chrome.storage.local.get('captureBatch');
  if (captureBatch?.id === id) await chrome.storage.local.remove('captureBatch');
}
