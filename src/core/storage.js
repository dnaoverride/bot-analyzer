import {emptyState, normalizeLoadedState, SCHEMA_VERSION} from './model.js';

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

    const state = normalizeLoadedState(raw);
    if (state.importErrors?.length) {
      throw Error('Neki sačuvani unosi nisu ispravni. ' + state.importErrors.join(' '));
    }
    delete state.importErrors;

    const needsSave = raw.schemaVersion !== SCHEMA_VERSION;
    if (needsSave) {
      try { await saveState(state); }
      catch (e) { throw Error('Migracija nije sačuvana; originalni podaci nisu obrisani. ' + e.message); }
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
