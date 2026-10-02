import {getAdapter} from '../adapters/index.js';
import {normalizeText} from './text.js';

export const SCHEMA_VERSION = 2;
const VALID_SOURCES = new Set(['manual', 'paste', 'visible-dom', 'approved-api', 'import']);

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

export function emptyState() {
  return {schemaVersion: SCHEMA_VERSION, records: [], reviews: {}, settings: {nearText: true, imageThreshold: 5}};
}

export function migrateRecordV1(raw) {
  const platform = raw.platform || 'tiktok';
  const adapter = getAdapter(platform);
  const profile = raw.profile || raw.profileUrl || '';
  const canonical = adapter.canonicalProfile(profile, true) || adapter.canonicalProfile(profile);
  if (!canonical) throw Error('Neispravan link profila pri migraciji.');
  const handle = raw.handle || adapter.handle(canonical);
  const postUrl = adapter.canonicalPost?.(raw.postUrl ?? raw.video ?? '') ?? adapter.validPost(raw.postUrl ?? raw.video ?? '');
  if (postUrl === null) throw Error('Neispravan link objave pri migraciji.');
  const source = normalizeSource(raw.source);
  let commentUrl = raw.commentUrl || null;
  if (!commentUrl && raw.commentId && postUrl && adapter.canonicalCommentUrl) {
    commentUrl = adapter.canonicalCommentUrl(postUrl, raw.commentId);
  }
  return {
    id: typeof raw.id === 'string' && /^[\w-]{1,100}$/.test(raw.id) ? raw.id : crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    platform,
    accountKey: raw.accountKey || accountKeyFor(platform, handle),
    handle,
    displayName: bounded(raw.displayName, 200) || null,
    profile: canonical,
    profileUrl: canonical,
    postUrl,
    commentUrl,
    commentId: bounded(raw.commentId, 100),
    text: bounded(raw.text ?? raw.comment, 5000),
    note: bounded(raw.note, 3000),
    avatar: raw.avatar || null,
    observedAt: typeof raw.observedAt === 'string' && Number.isFinite(Date.parse(raw.observedAt))
      ? new Date(raw.observedAt).toISOString()
      : new Date().toISOString(),
    publishedAt: raw.publishedAt ?? null,
    source,
    collectorVersion: bounded(raw.collectorVersion, 50) || null,
    caseId: bounded(raw.caseId, 100) || 'default'
  };
}

export function validateRecord(raw) {
  if (!raw || typeof raw !== 'object') throw Error('Neispravan unos.');
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
  return {
    id: typeof raw.id === 'string' && /^[\w-]{1,100}$/.test(raw.id) ? raw.id : crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    platform,
    accountKey: accountKeyFor(platform, handle),
    handle,
    displayName: bounded(raw.displayName, 200) || null,
    profile,
    profileUrl: profile,
    postUrl,
    commentUrl,
    commentId,
    text,
    note,
    avatar,
    observedAt,
    publishedAt,
    source,
    collectorVersion: bounded(raw.collectorVersion, 50) || null,
    caseId: bounded(raw.caseId, 100) || 'default'
  };
}

export function recordKey(r) {
  return JSON.stringify([r.platform, r.profile.toLowerCase(), r.postUrl, normalizeText(r.text), r.avatar?.dhash || '']);
}

export function mergeRecords(existing, incoming) {
  const records = [...existing];
  const keys = new Set(existing.map(recordKey));
  const ids = new Set(existing.map(r => r.id));
  let added = 0;
  for (const value of incoming) {
    const r = validateRecord(value);
    const key = recordKey(r);
    if (keys.has(key)) continue;
    if (ids.has(r.id)) r.id = crypto.randomUUID();
    if (records.length >= 2000) throw Error('Najviše 2.000 sačuvanih primera; podeli istraživanje u manje skupove.');
    records.push(r);
    keys.add(key);
    ids.add(r.id);
    added++;
  }
  return {records, added};
}

export function migrateStateV1(state) {
  const records = [];
  const errors = [];
  for (let i = 0; i < (state.records || []).length; i++) {
    try {
      records.push(migrateRecordV1(state.records[i]));
    } catch (e) {
      errors.push(`Zapis ${i + 1}: ${e.message}`);
    }
  }
  const reviews = Object.fromEntries(
    Object.entries(state.reviews || {}).filter(([key, value]) =>
      typeof key === 'string' && ['pending', 'include', 'dismiss'].includes(value))
  );
  const settings = {nearText: state.settings?.nearText !== false, imageThreshold: 5};
  return {
    schemaVersion: SCHEMA_VERSION,
    records,
    reviews,
    settings,
    errors,
    migratedFrom: 1
  };
}

export function importState(input) {
  let records, legacy = false, sourceVersion = SCHEMA_VERSION;
  if (Array.isArray(input)) {
    records = input;
    legacy = true;
    sourceVersion = 0;
  } else if (Array.isArray(input?.items)) {
    records = input.items;
    legacy = true;
    sourceVersion = 0;
  } else if (input?.schemaVersion === SCHEMA_VERSION && Array.isArray(input.records)) {
    records = input.records;
    sourceVersion = SCHEMA_VERSION;
  } else if (input?.schemaVersion === 1 && Array.isArray(input.records)) {
    records = input.records;
    sourceVersion = 1;
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
      accepted.push(validateRecord(prepared));
    } catch (e) {
      errors.push(`Red ${i + 1}: ${e.message}`);
    }
  }
  return {records: mergeRecords([], accepted).records, errors, legacy, sourceVersion};
}
