import {caseRecords, activeCase, getSubmission, validateRecord, mergeRecords} from './model.js';
import {analyze} from './analyze.js';

export const PACKAGE_SCHEMA = 'botanalyzer-evidence-package.v1';

const DISCLAIMER_SR = 'Ovo su ručno pregledani primeri javnih komentara/profila. Ne tvrdim da su nalozi automatizovani, kupljeni ili pod zajedničkom kontrolom. Molim platformu da proveri konkretno ponašanje.';
const DISCLAIMER_EN = 'These are manually reviewed examples of public comments/profiles. I do not claim the accounts are automated, purchased, or under shared control. I ask the platform to review the specific behavior.';

const TEXT = {
  sr: {
    reportTitle: 'Zahtev za proveru mogućeg spama ili povezane aktivnosti',
    reportEmpty: 'Označi pregledane nalaze opcijom „Uključi u nacrt“ da bi dobio prijavu sa dokazima.',
    examplesLabel: 'Primeri',
    postLabel: 'Objava',
    commentLabel: 'Komentar',
    observedLabel: 'Zabeleženo',
    observedHint: 'vreme prikupljanja, ne vreme objave',
    noteLabel: 'Napomena',
    avatarHint: 'Ako je nalaz zasnovan na profilnim slikama, priložite originalne screenshotove. Sačuvani mali pregledi i otisci služe analizi.',
    shareExportHeader: 'Deljivi slučaj BotAnalyzer',
    recordsLabel: 'zapisa'
  },
  en: {
    reportTitle: 'Request to review possible spam or coordinated activity',
    reportEmpty: 'Mark reviewed findings as “Include in report draft” to generate evidence.',
    examplesLabel: 'Examples',
    postLabel: 'Post',
    commentLabel: 'Comment',
    observedLabel: 'Observed',
    observedHint: 'collection time, not posting time',
    noteLabel: 'Note',
    avatarHint: 'If the finding relies on profile images, attach original screenshots. Stored previews and hashes are for analysis only.',
    shareExportHeader: 'BotAnalyzer shareable case',
    recordsLabel: 'records'
  }
};

function L(locale, key) {
  return TEXT[locale === 'en' ? 'en' : 'sr'][key] || TEXT.sr[key];
}

function disclaimer(locale) {
  return locale === 'en' ? DISCLAIMER_EN : DISCLAIMER_SR;
}

function serializeRecord(r) {
  return {
    id: r.id,
    platform: r.platform,
    profileUrl: r.profileUrl || r.profile,
    handle: r.handle,
    postUrl: r.postUrl,
    commentUrl: r.commentUrl || null,
    commentId: r.commentId || null,
    postAuthor: r.postAuthor || null,
    text: r.text,
    note: r.note || '',
    observedAt: r.observedAt,
    source: r.source
  };
}

export function buildEvidencePackage(state, analysis, {purpose = 'report', locale = 'sr'} = {}) {
  const caseInfo = activeCase(state);
  const caseId = state.activeCaseId;
  const activeRecords = caseRecords(state, caseId);
  const caseAnalysis = analysis || analyze(activeRecords, state.settings);

  if (purpose === 'share') {
    return {
      packageSchema: PACKAGE_SCHEMA,
      purpose: 'share',
      generatedAt: new Date().toISOString(),
      disclaimer: disclaimer(locale),
      case: {id: caseInfo.id, title: caseInfo.title},
      records: activeRecords.map(serializeRecord)
    };
  }

  const findings = [...caseAnalysis.groups, ...caseAnalysis.pairs]
    .filter(f => state.reviews[f.id] === 'include');
  const recordIds = new Set();
  for (const f of findings) for (const id of f.recordIds) recordIds.add(id);
  const records = activeRecords.filter(r => recordIds.has(r.id));
  const platforms = [...new Set(findings.map(f => f.platform))];
  const submission = {};
  for (const platform of platforms) submission[platform] = getSubmission(state, caseId, platform);

  return {
    packageSchema: PACKAGE_SCHEMA,
    purpose: 'report',
    generatedAt: new Date().toISOString(),
    disclaimer: disclaimer(locale),
    case: {id: caseInfo.id, title: caseInfo.title},
    platforms,
    findings: findings.map(f => ({
      id: f.id,
      kind: f.kind,
      platform: f.platform,
      title: f.title,
      explanation: f.explanation || null,
      signals: f.signals || [],
      recordIds: f.recordIds
    })),
    records: records.map(serializeRecord),
    submission
  };
}

export function packageToText(pkg, locale = 'sr') {
  if (pkg.purpose === 'share') {
    return L(locale, 'shareExportHeader') + '\n' + pkg.case.title + '\n' + pkg.records.length + ' ' + L(locale, 'recordsLabel');
  }
  if (!pkg.findings?.length) return L(locale, 'reportEmpty');
  const lines = [L(locale, 'reportTitle'), '', pkg.disclaimer, ''];
  for (const f of pkg.findings) {
    lines.push(f.title);
    if (f.explanation) lines.push(f.explanation);
    for (const s of f.signals || []) lines.push('- ' + s.label + ' — ' + s.detail);
    lines.push('');
  }
  lines.push(L(locale, 'examplesLabel') + ':');
  pkg.records.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.profileUrl}`);
    if (r.postUrl) lines.push(L(locale, 'postLabel') + ': ' + r.postUrl);
    if (r.text) lines.push(L(locale, 'commentLabel') + ': ' + r.text);
    lines.push(L(locale, 'observedLabel') + ': ' + r.observedAt + ' (' + L(locale, 'observedHint') + ')');
    if (r.note) lines.push(L(locale, 'noteLabel') + ': ' + r.note);
    lines.push('');
  });
  lines.push(L(locale, 'avatarHint'));
  return lines.join('\n');
}

export function importSharePackage(state, input, {mode = 'new', title = ''} = {}) {
  if (input?.packageSchema !== PACKAGE_SCHEMA || input?.purpose !== 'share') {
    throw Error('Ovo nije deljivi BotAnalyzer fajl (purpose: share).');
  }
  if (!Array.isArray(input.records) || !input.records.length) {
    throw Error('Deljivi fajl nema zapisa.');
  }
  let next = state;
  let targetCaseId = state.activeCaseId;
  if (mode === 'new') {
    const caseTitle = String(title || input.case?.title || 'Uvezeni slučaj').trim().slice(0, 200) || 'Uvezeni slučaj';
    const id = crypto.randomUUID();
    next = {
      ...state,
      cases: [...(state.cases || []), {id, title: caseTitle, createdAt: new Date().toISOString()}],
      activeCaseId: id
    };
    targetCaseId = id;
  }
  const accepted = [], errors = [];
  for (let i = 0; i < input.records.length; i++) {
    try {
      accepted.push(validateRecord({
        ...input.records[i],
        profile: input.records[i].profileUrl || input.records[i].profile,
        source: 'paste',
        caseId: targetCaseId
      }, {newIds: true}));
    } catch (e) {
      errors.push(`Red ${i + 1}: ${e.message}`);
    }
  }
  const merged = mergeRecords(next.records, accepted, {caseId: targetCaseId, newIds: true});
  return {
    state: {...next, records: merged.records, reviews: next.reviews},
    added: merged.added,
    skipped: merged.skipped,
    errors
  };
}
