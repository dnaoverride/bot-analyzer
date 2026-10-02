import test from 'node:test';
import assert from 'node:assert/strict';
import {tiktok} from '../src/adapters/tiktok.js';
import {registerAdapter} from '../src/adapters/index.js';
import {normalizeText, usernameStem} from '../src/core/text.js';
import {instagram} from '../src/adapters/instagram.js';
import {
  validateRecord, mergeRecords, emptyState, importState, migrateStateV1, migrateStateV2,
  SCHEMA_VERSION, createCase, caseRecords
} from '../src/core/model.js';
import {analyze} from '../src/core/analyze.js';
import {compareAvatars, fingerprintsFromGray, hamming} from '../src/core/image.js';
import {buildReport, csv} from '../src/core/report.js';
import {buildEvidencePackage, importSharePackage as importShare} from '../src/core/evidence-package.js';

const message = 'Ovo je ista dovoljno duga poruka za proveru';
const record = (profile, text = message, extra = {}) => validateRecord({
  platform: 'tiktok', profile, text, postUrl: 'https://www.tiktok.com/@fixture/video/123', source: 'manual', caseId: 'default', ...extra
});

test('profile URL rejects spoofed hosts and script schemes', () => {
  assert.equal(tiktok.canonicalProfile('@primer22'), 'https://www.tiktok.com/@primer22');
  for (const input of ['https://www.tiktok.com.evil.test/@name', 'javascript:alert(1)', 'http://www.tiktok.com/@name', 'https://evil.test/?next=https://www.tiktok.com/@name']) {
    assert.equal(tiktok.canonicalProfile(input), null);
  }
  assert.equal(tiktok.validPost('https://tiktok.com.evil.test/video'), null);
});

test('Serbian scripts and punctuation normalize without changing source', () => {
  assert.equal(normalizeText('Ви ћете да ми чувате УСТАВ!'), 'vi cete da mi cuvate ustav');
  assert.equal(normalizeText('Vi ćete da mi čuvate ustav.'), 'vi cete da mi cuvate ustav');
});

test('duplicates do not inflate evidence', () => {
  const a = record('@primer22'), b = record('@primer22', message + '!');
  const result = mergeRecords([a], [b]);
  assert.equal(result.added, 0);
  assert.equal(result.records.length, 1);
});

test('repeated group requires different accounts, not repeated collection', () => {
  assert.equal(analyze([record('@primer22'), record('@primer22'), record('@primer23')]).groups.length, 0);
  assert.equal(analyze([record('@primer22'), record('@primer23'), record('@primer24')]).groups.length, 1);
});

test('short generic comments are not textual signals', () => {
  const result = analyze([record('@different_a', 'Bravo!'), record('@different_b', 'Bravo!')]);
  assert.equal(result.groups.length, 0);
  assert.equal(result.pairs.length, 0);
});

test('numeric clones add a separate weak clue', () => {
  const result = analyze([record('@primer22'), record('@primer23')]);
  assert.equal(result.pairs.length, 1);
  assert.equal(result.pairs[0].signals.length, 2);
  assert.equal(result.pairs[0].priority, 'multiple');
  assert.equal(usernameStem('abc22'), null);
});

test('single weak clue is not a bot score', () => {
  const result = analyze([record('@primer22', 'jedan sasvim drugaciji tekst'), record('@primer23', 'druga kratka poruka')]);
  assert.equal(result.pairs[0].priority, 'single');
  assert.equal(result.pairs[0].signals.length, 1);
  assert.equal(result.pairs[0].score, undefined);
});

test('token similarity setting changes near text matching', () => {
  const a = record('@different_a', 'jedan dva tri cetiri pet sest sedam osam devet deset');
  const b = record('@different_b', 'jedan dva tri cetiri pet sest sedam osam devet deset dodatak');
  assert.equal(analyze([a, b], {nearText: true}).pairs.length, 1);
  assert.equal(analyze([a, b], {nearText: false}).pairs.length, 0);
});

test('solid avatars cannot independently match', () => {
  const flat = fingerprintsFromGray(new Array(72).fill(120));
  assert.equal(flat.contrast, 0);
  assert.equal(compareAvatars(flat, flat), null);
});

test('structured image fingerprints match and different hashes do not', () => {
  const gray = Array.from({length: 72}, (_, i) => (i % 9) * 25);
  const image = fingerprintsFromGray(gray);
  assert.ok(image.contrast >= 8);
  assert.equal(hamming('0000000000000000', 'ffffffffffffffff'), 64);
  assert.equal(compareAvatars(image, image).distance, 0);
  assert.equal(compareAvatars(image, {...image, dhash: 'ffffffffffffffff'}), null);
});

test('reports exclude pending and dismissed findings', () => {
  const records = [record('@primer22'), record('@primer23')];
  const state = {...emptyState(), records};
  const result = analyze(records);
  assert.equal(buildReport(state, result).records.length, 0);
  state.reviews[result.pairs[0].id] = 'dismiss';
  assert.equal(buildReport(state, result).records.length, 0);
  state.reviews[result.pairs[0].id] = 'include';
  const report = buildReport(state, result);
  assert.equal(report.records.length, 2);
  assert.match(report.text, /prikupljanja|collection time/i);
});

test('legacy JSON migration keeps text but flags image-only records', () => {
  const result = importState([{profile: 'https://www.tiktok.com/@primer22', comment: message, video: '', note: '', time: 'legacy'}, {profile: 'https://www.tiktok.com/@primer23', comment: '', video: '', note: '', time: 'legacy', hash: 'ffffffffffffffff', thumb: 'old'}]);
  assert.equal(result.records.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.legacy, true);
});

test('invalid imports are reported and HTML avatar data rejected', () => {
  const result = importState({schemaVersion: 1, records: [{profile: 'https://evil.test', text: 'test'}]});
  assert.equal(result.errors.length, 1);
  assert.throws(() => record('@primer22', message, {avatar: {dhash: '0000000000000000', ahash: '0000000000000000', contrast: 12, thumb: 'data:text/html;base64,AAA'}}));
});

test('CSV neutralizes spreadsheet formulas and quotes', () => {
  const out = csv([record('@primer22', '=HYPERLINK("bad")')]);
  assert.ok(out.includes('"\'=HYPERLINK(""bad"")"'));
});

test('adapter partition prevents cross-network findings', () => {
  registerAdapter({id: 'fixture', name: 'Fixture', canonicalProfile: x => String(x).startsWith('https://fixture.test/') ? x : null, handle: x => x.split('/').pop(), validPost: x => x || '', reporting: {steps: [], helpUrl: ''}});
  const a = record('@primer22');
  const b = validateRecord({platform: 'fixture', profile: 'https://fixture.test/primer23', text: message});
  assert.equal(analyze([a, b]).pairs.length, 0);
});

test('instagram profile and post URLs parse correctly', () => {
  assert.equal(instagram.canonicalProfile('https://www.instagram.com/korisnik/', true), 'https://www.instagram.com/korisnik/');
  assert.equal(instagram.canonicalProfile('@korisnik', true), 'https://www.instagram.com/korisnik/');
  assert.equal(instagram.canonicalProfile('@korisnik', false), null);
  assert.equal(instagram.validPost('https://www.instagram.com/p/ABC123/?igsh=foo'), 'https://www.instagram.com/p/ABC123/');
});

test('instagram rejects spoofed domains and reserved paths', () => {
  for (const input of ['https://instagram.com.evil.test/korisnik/', 'javascript:alert(1)', 'https://www.instagram.com/accounts/login/']) {
    assert.equal(instagram.canonicalProfile(input, true), null);
  }
});

test('schema v1 migrates through v2 to v3', () => {
  const v1 = {schemaVersion: 1, records: [{id: 'r1', platform: 'tiktok', profile: 'https://www.tiktok.com/@primer22', handle: 'primer22', postUrl: 'https://www.tiktok.com/@primer22/video/1', text: message, source: 'import', observedAt: '2026-01-01T00:00:00.000Z'}], reviews: {}, settings: {nearText: true}};
  const v2 = migrateStateV1(v1);
  const v3 = migrateStateV2(v2);
  assert.equal(v3.schemaVersion, SCHEMA_VERSION);
  assert.equal(v3.cases.length >= 1, true);
  assert.equal(v3.records[0].accountKey, 'tiktok:primer22');
});

test('same handle on different networks stays separate', () => {
  const tik = validateRecord({platform: 'tiktok', profile: '@primer22', text: message, postUrl: 'https://www.tiktok.com/@primer22/video/1', source: 'manual'});
  const ig = validateRecord({platform: 'instagram', _explicitPlatform: true, profile: '@primer22', text: message, postUrl: 'https://www.instagram.com/p/ABC123/', source: 'manual'});
  assert.equal(analyze([tik, ig]).pairs.length, 0);
});

test('cases isolate records for analysis', () => {
  const state = createCase(emptyState(), 'Drugi');
  const r1 = validateRecord({platform: 'tiktok', profile: '@a', text: message, postUrl: 'https://www.tiktok.com/@a/video/1', caseId: 'default'});
  const r2 = validateRecord({platform: 'tiktok', profile: '@b', text: message, postUrl: 'https://www.tiktok.com/@b/video/2', caseId: state.activeCaseId});
  const full = {...state, records: [r1, r2]};
  assert.equal(caseRecords(full, 'default').length, 1);
  assert.equal(caseRecords(full, state.activeCaseId).length, 1);
});

test('share import does not copy include reviews or submission status', () => {
  const records = [record('@primer22'), record('@primer23'), record('@primer24')];
  const state = {...emptyState(), records};
  const analysis = analyze(records);
  state.reviews[analysis.pairs[0].id] = 'include';
  state.submissions = {default: {tiktok: {status: 'marked_sent', outcomeNote: 'x'}}};
  const share = buildEvidencePackage(state, analysis, {purpose: 'share'});
  assert.equal(share.purpose, 'share');
  assert.equal(share.findings, undefined);
  const imported = importShare(emptyState(), share, {mode: 'new'});
  assert.equal(imported.added, 3);
  assert.equal(Object.values(imported.state.reviews).filter(v => v === 'include').length, 0);
  assert.deepEqual(imported.state.submissions, {});
});

test('report package only includes reviewed include findings', () => {
  const records = [record('@primer22'), record('@primer23'), record('@primer24')];
  const state = {...emptyState(), records};
  const analysis = analyze(records);
  state.reviews[analysis.groups[0]?.id || analysis.pairs[0].id] = 'include';
  const pkg = buildEvidencePackage(state, analysis, {purpose: 'report'});
  assert.equal(pkg.purpose, 'report');
  assert.ok(pkg.findings.length >= 1);
  assert.ok(pkg.records.length >= 2);
});
