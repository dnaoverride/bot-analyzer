import {getAdapter} from '../adapters/index.js';
import {buildEvidencePackage, packageToText} from './evidence-package.js';

export function buildReport(state, analysis, locale = state.settings?.locale || 'sr') {
  const pkg = buildEvidencePackage(state, analysis, {purpose: 'report', locale});
  const findings = pkg.findings?.length || 0;
  const records = pkg.records || [];
  return {
    text: packageToText(pkg, locale),
    findings,
    records,
    package: pkg
  };
}

export function csv(records) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = [
    ['mreza', 'profil', 'objava', 'komentar', 'napomena', 'zabelezeno', 'izvor'],
    ...records.map(r => [r.platform, r.profile || r.profileUrl, r.postUrl, r.text, r.note, r.observedAt, r.source])
  ];
  return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}

export function instructions(platform) {
  return getAdapter(platform).reporting;
}
