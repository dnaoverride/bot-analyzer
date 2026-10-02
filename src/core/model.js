import {getAdapter} from '../adapters/index.js';
import {normalizeText} from './text.js';

export const SCHEMA_VERSION = 3;
const RECORD_SCHEMA = 2;
const VALID_SOURCES = new Set(['manual', 'paste', 'visible-dom', 'approved-api', 'import']);
const VALID_SUBMISSION = new Set(['not_sent', 'marked_sent', 'outcome_noted']);

function bounded(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function normalizeSource(source) {
  if (source === 'import') return 'paste';
  return VALID_SOURCES.has(source) ? source : 'paste';
}

function accountKeyFor(platform, handle) {
  return platform + ':' + String(handle).toLowerCase();
}

export function defaultCase(title = 'Glavni slučaj') {
  return {id: 'default', title, createdAt: new Date().toISOString()};
}

export function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    cases: [defaultCase()],
    activeCaseId: 'default',
    records: [],
    reviews: {},
    submissions: {},
    settings: {nearText: true, imageThreshold: 5, locale: 'sr'}
  };
}

export function caseRecords(state, caseId = state.activeCaseId) {
  return (state.records || []).filter(r => r.caseId === caseId);
}

export function activeCase(state) {
  return (state.cases || []).find(c => c.id === state.activeCaseId) || state.cases?.[0] || defaultCase();
}

export function createCase(state, title) {
  const trimmed = String(title || '').trim().slice(0, 200);
  if (!trimmed) throw Error('Unesi naziv slučaja.');
  const id = crypto.randomUUID();
  const cases = [...(state.cases || []), {id, title: trimmed, createdAt: new Date().toISOString()}];
  return {...state, cases, activeCaseId: id};
}

export function renameCase(state, caseId, title) {
  const trimmed = String(title || '').trim().slice(0, 200);
  if (!trimmed) throw Error('Unesi naziv slučaja.');
  const cases = (state.cases || []).map(c => c.id === caseId ? {...c, title: trimmed} : c);
  return {...state, cases};
}

export function deleteCase(state, caseId) {
  if (caseId === 'default') throw Error('Glavni slučaj se ne može obrisati.');
  const remaining = (state.records || []).filter(r => r.caseId === caseId);
  if (remaining.length) throw Error('Slučaj ima sačuvane primere. Obriši ih ili prebaci pre brisanja slučaja.');
  const cases = (state.cases || []).filter(c => c.id !== caseId);
  const activeCaseId = state.activeCaseId === caseId ? 'default' : state.activeCaseId;
  const submissions = {...state.submissions};
  delete submissions[caseId];
  return {...state, cases, activeCaseId, submissions};
}

export function setSubmission(state, caseId, platform, status, outcomeNote = '') {
  if (!VALID_SUBMISSION.has(status)) throw Error('Neispravan status slanja.');
  const submissions = {...state.submissions};
  const caseSubs = {...(submissions[caseId] || {})};
  caseSubs[platform] = {status, outcomeNote: bounded(outcomeNote, 1000)};
  submissions[caseId] = caseSubs;
  return {...state, submissions};
}

export function getSubmission(state, caseId, platform) {
  return state.submissions?.[caseId]?.[platform] || {status: 'not_sent', outcomeNote: ''};
}

function buildRecord(raw, options = {}) {
  const platform = raw.platform || 'tiktok';
  const adapter = getAdapter(platform);
  const explicit = raw.platform === 'instagram' || !!raw._explicitPlatform;
  const profile = adapter.canonicalProfile(raw.profile || raw.profileUrl || '', explicit)
    || adapter.canonicalProfile(raw.profile || raw.profileUrl || '');
  if (!profile) throw Error('Neispravan link profila.');
  const handle = raw.handle || adapter.handle(profile);
  const postInput = raw.postUrl ?? raw.video ?? '';
  const postUrl = adapter.canonicalPost?.(postInput) ?? adapter.validPost(postInput);
  if (postUrl === null) throw Error('Neispravan link objave.');
  const text = bounded(raw.text ?? raw.comment, 5000);
  const note = bounded(raw.note, 3000);
  let avatar = null;
  if (raw.avatar) {
    const a = raw.avatar;
    if (!/^[0-9a-f]{16}$/.test(a.dhash) || !/^[0-9a-f]{16}$/.test(a.ahash)
      || !Number.isFinite(a.contrast) || a.contrast < 0 || a.contrast > 255
      || typeof a.thumb !== 'string' || a.thumb.length > 60000
      || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.thumb)) {
      throw Error('Neispravan otisak slike.');
    }
    avatar = {dhash: a.dhash, ahash: a.ahash, contrast: a.contrast, thumb: a.thumb};
  }
  if (!text.trim() && !avatar) throw Error('Dodaj komentar ili profilnu sliku.');
  const observedAt = typeof raw.observedAt === 'string' && Number.isFinite(Date.parse(raw.observedAt))
    ? new Date(raw.observedAt).toISOString()
    : new Date().toISOString();
  const source = normalizeSource(raw.source);
  const commentId = bounded(raw.commentId, 100);
  let commentUrl = raw.commentUrl || null;
  if (!commentUrl && commentId && postUrl && adapter.canonicalCommentUrl) {
    commentUrl = adapter.canonicalCommentUrl(postUrl, commentId);
  }
  const publishedAt = raw.publishedAt ?? null;
  if (publishedAt !== null && (typeof publishedAt !== 'string' || !Number.isFinite(Date.parse(publishedAt)))) {
    throw Error('publishedAt mora biti ISO datum ili null.');
  }
  const postAuthor = raw.postAuthor ? bounded(raw.postAuthor, 300) : null;
  return {
    id: typeof raw.id === 'string' && /^[\w-]{1,100}$/.test(raw.id) && !options.newIds
      ? raw.id : crypto.randomUUID(),
    schemaVersion: RECORD_SCHEMA,
    platform,
    accountKey: accountKeyFor(platform, handle),
    handle,
    displayName: bounded(raw.displayName, 200) || null,
    profile,
    profileUrl: profile,
    postUrl,
    commentUrl,
    commentId,
    postAuthor,
    text,
    note,
    avatar,
    observedAt,
    publishedAt,
    source,
    collectorVersion: bounded(raw.collectorVersion, 50) || null,
    caseId: bounded(raw.caseId, 100) || options.caseId || 'default'
  };
}

export function migrateRecordV1(raw) {
  return buildRecord(raw);
}

export function validateRecord(raw, options = {}) {
  if (!raw || typeof raw !== 'object') throw Error('Neispravan unos.');
  return buildRecord(raw, options);
}

export function recordKey(r) {
  return JSON.stringify([r.platform, r.profile.toLowerCase(), r.postUrl, normalizeText(r.text), r.avatar?.dhash || '']);
}

export function mergeRecords(existing, incoming, options = {}) {
  const records = [...existing];
  const keys = new Set(existing.map(recordKey));
  const ids = new Set(existing.map(r => r.id));
  let added = 0, skipped = 0;
  for (const value of incoming) {
    const r = validateRecord({...value, caseId: value.caseId || options.caseId}, {newIds: options.newIds});
    const key = recordKey(r);
    if (keys.has(key)) { skipped++; continue; }
    if (ids.has(r.id)) r.id = crypto.randomUUID();
    if (records.length >= 2000) throw Error('Najviše 2.000 sačuvanih primera; podeli istraživanje u manje skupove.');
    records.push(r);
    keys.add(key);
    ids.add(r.id);
    added++;
  }
  return {records, added, skipped};
}

export function migrateStateV1(state) {
  const records = [], errors = [];
  for (let i = 0; i < (state.records || []).length; i++) {
    try { records.push(migrateRecordV1(state.records[i])); }
    catch (e) { errors.push(`Zapis ${i + 1}: ${e.message}`); }
  }
  const reviews = Object.fromEntries(Object.entries(state.reviews || {}).filter(([k, v]) =>
    typeof k === 'string' && ['pending', 'include', 'dismiss'].includes(v)));
  return {
    schemaVersion: 2,
    records,
    reviews,
    settings: {nearText: state.settings?.nearText !== false, imageThreshold: 5, locale: 'sr'},
    errors,
    migratedFrom: 1
  };
}

export function migrateStateV2(state) {
  const caseMap = new Map();
  for (const r of state.records || []) {
    const id = r.caseId || 'default';
    if (!caseMap.has(id)) caseMap.set(id, {id, title: id === 'default' ? 'Glavni slučaj' : id.slice(0, 40), createdAt: new Date().toISOString()});
  }
  if (!caseMap.has('default')) caseMap.set('default', defaultCase());
  const cases = [...caseMap.values()];
  const activeCaseId = state.activeCaseId && cases.some(c => c.id === state.activeCaseId) ? state.activeCaseId : 'default';
  return {
    schemaVersion: SCHEMA_VERSION,
    cases,
    activeCaseId,
    records: state.records || [],
    reviews: state.reviews || {},
    submissions: state.submissions || {},
    settings: {
      nearText: state.settings?.nearText !== false,
      imageThreshold: 5,
      locale: state.settings?.locale === 'en' ? 'en' : 'sr'
    },
    migratedFrom: 2
  };
}

export function normalizeLoadedState(raw) {
  let working = raw;
  if (raw.schemaVersion === 1) working = migrateStateV1(raw);
  if (working.schemaVersion === 2 || !working.cases) working = migrateStateV2(working);
  const imported = importState({schemaVersion: SCHEMA_VERSION, records: working.records || []});
  const reviews = Object.fromEntries(Object.entries(working.reviews || {}).filter(([k, v]) =>
    typeof k === 'string' && ['pending', 'include', 'dismiss'].includes(v)));
  const settings = {
    nearText: working.settings?.nearText !== false,
    imageThreshold: 5,
    locale: working.settings?.locale === 'en' ? 'en' : 'sr'
  };
  return {
    ...emptyState(),
    cases: working.cases?.length ? working.cases : [defaultCase()],
    activeCaseId: working.activeCaseId || 'default',
    records: imported.records,
    reviews,
    submissions: working.submissions || {},
    settings,
    importErrors: imported.errors
  };
}

export function importState(input) {
  let records, legacy = false, sourceVersion = SCHEMA_VERSION;
  if (Array.isArray(input)) {
    records = input; legacy = true; sourceVersion = 0;
  } else if (Array.isArray(input?.items)) {
    records = input.items; legacy = true; sourceVersion = 0;
  } else if (Array.isArray(input?.records)) {
    records = input.records;
    sourceVersion = input.schemaVersion ?? SCHEMA_VERSION;
  } else {
    throw Error('Nepodržan JSON format.');
  }
  if (records.length > 10000) throw Error('Najviše 10.000 unosa po uvozu.');
  const accepted = [], errors = [];
  for (let i = 0; i < records.length; i++) {
    try {
      const raw = records[i];
      if (legacy && !raw.comment?.trim()) {
        errors.push(`Red ${i + 1}: stari unos sadrži samo sliku; dodaj sliku ponovo.`);
        continue;
      }
      const prepared = legacy
        ? {platform: 'tiktok', ...raw, text: raw.comment, observedAt: undefined, source: 'paste'}
        : sourceVersion === 1 ? migrateRecordV1(raw) : raw;
      accepted.push(validateRecord(prepared, {newIds: true}));
    } catch (e) {
      errors.push(`Red ${i + 1}: ${e.message}`);
    }
  }
  return {records: mergeRecords([], accepted, {newIds: true}).records, errors, legacy, sourceVersion};
}
