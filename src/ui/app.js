import {
  emptyState, mergeRecords, importState, validateRecord, SCHEMA_VERSION,
  caseRecords, activeCase, createCase, renameCase, deleteCase, setSubmission, getSubmission
} from '../core/model.js';
import {analyze} from '../core/analyze.js';
import {fingerprintFile} from '../core/image.js';
import {buildReport, csv, instructions} from '../core/report.js';
import {buildEvidencePackage, importSharePackage, PACKAGE_SCHEMA} from '../core/evidence-package.js';
import {loadState, saveState, takeCapture, clearCapture, extensionMode} from '../core/storage.js';
import {listAdapters} from '../adapters/index.js';
import {t} from './i18n.js';

let state = emptyState(), active = 'analysis', analysis, pending = null, loadFailed = false;
let selectedPlatform = 'tiktok', platformFilter = 'all';
const adapters = listAdapters();
const root = document.getElementById('app');

const platformHints = {
  tiktok: {profile: '@primer123', post: 'https://www.tiktok.com/@autor/video/…', paste: '@primer123\tTekst\thttps://www.tiktok.com/…'},
  instagram: {profile: '@korisnik', post: 'https://www.instagram.com/p/…', paste: '@korisnik\tTekst\thttps://www.instagram.com/p/…'}
};

function locale() { return state.settings?.locale || 'sr'; }

function node(tag, text, cls) {
  const x = document.createElement(tag);
  if (text !== undefined) x.textContent = text;
  if (cls) x.className = cls;
  return x;
}

function button(label, fn, cls) {
  const b = node('button', label, cls);
  b.type = 'button';
  b.addEventListener('click', async () => {
    b.disabled = true;
    try { await fn(); } catch (e) { message(e.message, true); } finally { b.disabled = false; }
  });
  return b;
}

function anchor(url, text) {
  const a = node('a', text || url);
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}

function message(text, error = false) {
  const box = document.getElementById('status');
  if (!box) return;
  box.textContent = text;
  box.className = 'status' + (error ? ' error' : '');
  box.hidden = false;
}

async function commit(next) {
  if (loadFailed) throw Error('Učitavanje nije uspelo.');
  await saveState(next);
  state = next;
  render();
}

function download(name, type, value) {
  const url = URL.createObjectURL(new Blob([value], {type}));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function activeRecords() { return caseRecords(state); }

function identity(record) {
  const div = node('div', undefined, 'identity');
  if (record.avatar) {
    const img = node('img');
    img.src = record.avatar.thumb;
    img.alt = 'avatar';
    img.className = 'avatar';
    div.append(img);
  }
  const col = node('div');
  col.append(node('span', record.platform, 'badge'), anchor(record.profile, '@' + record.handle));
  if (record.postUrl) col.append(node('br'), anchor(record.postUrl, t('openPost', locale())));
  div.append(col);
  return div;
}

function field(form, labelText, name, type = 'text') {
  const label = node('label', labelText);
  label.htmlFor = name;
  const input = node(type === 'textarea' ? 'textarea' : 'input');
  input.id = name; input.name = name;
  if (type !== 'textarea') input.type = type;
  form.append(label, input);
  return input;
}

function emptyBox(text) { return node('div', text, 'empty'); }

function filteredFindings() {
  const all = [...analysis.groups, ...analysis.pairs];
  if (platformFilter === 'all') return all;
  return all.filter(f => f.platform === platformFilter);
}

function renderCaseBar(main) {
  const row = node('div', undefined, 'row case-bar');
  const label = node('label', t('caseLabel', locale()));
  label.htmlFor = 'case-select';
  const select = node('select');
  select.id = 'case-select';
  for (const c of state.cases || []) {
    const opt = node('option', c.title);
    opt.value = c.id;
    select.append(opt);
  }
  select.value = state.activeCaseId;
  select.onchange = async () => {
    await commit({...state, activeCaseId: select.value});
  };
  row.append(label, select);
  row.append(button(t('newCase', locale()), async () => {
    const title = prompt(t('newCase', locale()), '');
    if (!title) return;
    await commit(createCase(state, title));
  }));
  row.append(button(t('renameCase', locale()), async () => {
    const title = prompt(t('renameCase', locale()), activeCase(state).title);
    if (!title) return;
    await commit(renameCase(state, state.activeCaseId, title));
  }));
  if (state.activeCaseId !== 'default') {
    row.append(button(t('deleteCase', locale()), async () => {
      await commit(deleteCase(state, state.activeCaseId));
    }));
  }
  main.append(row);
}

function render() {
  const records = activeRecords();
  analysis = analyze(records, state.settings);
  const loc = locale();
  root.replaceChildren();
  const header = node('header');
  const top = node('div', undefined, 'topline');
  top.append(node('h1', t('appTitle', loc)), node('span', t('badge', loc), 'badge'));
  header.append(top, node('p', t('tagline', loc)));
  root.append(header);
  const main = node('main');
  const status = node('div', undefined, 'status');
  status.id = 'status'; status.setAttribute('role', 'status'); status.hidden = true;
  main.append(status);
  renderCaseBar(main);
  const stats = node('div', undefined, 'stats');
  for (const [n, key] of [
    [records.length, 'statRecords'],
    [new Set(records.map(r => r.platform + '|' + r.profile.toLowerCase())).size, 'statProfiles'],
    [analysis.pairs.filter(p => p.priority === 'multiple').length, 'statPairs']
  ]) {
    const card = node('div', undefined, 'stat');
    card.append(node('strong', String(n)), node('span', t(key, loc), 'muted'));
    stats.append(card);
  }
  main.append(stats);
  const tabs = node('nav', undefined, 'tabs');
  tabs.setAttribute('aria-label', 'tabs');
  for (const [id, key] of [['analysis', 'tabAnalysis'], ['add', 'tabAdd'], ['records', 'tabRecords'], ['report', 'tabReport'], ['help', 'tabHelp']]) {
    const b = button(t(key, loc), () => { active = id; render(); });
    b.setAttribute('aria-selected', String(active === id));
    tabs.append(b);
  }
  main.append(tabs);
  if (active === 'analysis') renderAnalysis(main);
  if (active === 'add') renderAdd(main);
  if (active === 'records') renderRecords(main);
  if (active === 'report') renderReport(main);
  if (active === 'help') renderHelp(main);
  root.append(main, node('footer', t('footer', loc)));
}

function reviewControl(f) {
  const loc = locale();
  const div = node('div', undefined, 'review');
  const label = node('label', t('reviewLabel', loc));
  label.htmlFor = 'review-' + f.id;
  const select = node('select');
  select.id = label.htmlFor;
  for (const [value, key] of [['pending', 'reviewPending'], ['include', 'reviewInclude'], ['dismiss', 'reviewDismiss']]) {
    const opt = node('option', t(key, loc));
    opt.value = value;
    select.append(opt);
  }
  select.value = state.reviews[f.id] || 'pending';
  select.onchange = async () => {
    const old = state.reviews[f.id] || 'pending';
    try { await commit({...state, reviews: {...state.reviews, [f.id]: select.value}}); }
    catch (e) { select.value = old; message(e.message, true); }
  };
  div.append(label, select);
  return div;
}

function recordPreview(r) {
  const div = node('div');
  div.append(identity(r));
  if (r.text) div.append(node('p', r.text, 'quote'));
  if (r.note) div.append(node('p', r.note, 'muted'));
  return div;
}

function renderAnalysis(main) {
  const loc = locale();
  main.append(node('h2', t('analysisTitle', loc)), node('p', t('analysisHint', loc), 'muted'));
  const filterRow = node('div', undefined, 'row');
  const filterLabel = node('label', t('filterPlatform', loc));
  filterLabel.htmlFor = 'platform-filter';
  const filterSelect = node('select');
  filterSelect.id = 'platform-filter';
  filterSelect.append(node('option', t('allPlatforms', loc)));
  filterSelect.firstChild.value = 'all';
  for (const a of adapters) {
    const opt = node('option', a.name);
    opt.value = a.id;
    filterSelect.append(opt);
  }
  filterSelect.value = platformFilter;
  filterSelect.onchange = () => { platformFilter = filterSelect.value; render(); };
  filterRow.append(filterLabel, filterSelect);
  main.append(filterRow);
  for (const w of analysis.warnings) main.append(node('p', w, 'status error'));
  if (!activeRecords().length) { main.append(emptyBox(t('emptyAnalysis', loc))); return; }
  const findings = filteredFindings();
  if (!findings.length) main.append(emptyBox(t('emptyFiltered', loc)));
  for (const f of findings) {
    const card = node('article', undefined, 'finding' + (f.priority === 'multiple' ? ' priority' : ''));
    card.append(node('h3', f.title), node('span', f.platform, 'badge'));
    if (f.explanation) card.append(node('p', f.explanation, 'muted'));
    if (f.signals) {
      card.append(node('span', String(f.signals.length), 'badge'));
      for (const s of f.signals) {
        const div = node('div', undefined, 'signal');
        div.append(node('strong', s.label), node('p', s.detail, 'muted'));
        card.append(div);
      }
    }
    const detail = document.createElement('details');
    detail.append(node('summary', t('viewExamples', loc)));
    for (const id of f.recordIds) {
      const r = state.records.find(x => x.id === id);
      if (r) detail.append(recordPreview(r), node('hr'));
    }
    card.append(detail, reviewControl(f));
    main.append(card);
  }
}

function renderAdd(main) {
  const loc = locale();
  const grid = node('div', undefined, 'grid');
  const panel = node('section', undefined, 'panel');
  const form = node('form');
  const adapter = adapters.find(a => a.id === selectedPlatform) || adapters[0];
  panel.append(node('h2', t('manualEntry', loc) + ' ' + adapter.name));
  const platformSelect = node('select');
  platformSelect.id = 'platform-select';
  for (const a of adapters) {
    const opt = node('option', a.name);
    opt.value = a.id;
    platformSelect.append(opt);
  }
  platformSelect.value = selectedPlatform;
  platformSelect.onchange = () => { selectedPlatform = platformSelect.value; render(); };
  panel.append(node('label', t('network', loc)), platformSelect);
  const hints = platformHints[selectedPlatform] || platformHints.tiktok;
  const profile = field(form, t('profileLabel', loc), 'profile');
  profile.required = true;
  profile.placeholder = hints.profile;
  if (selectedPlatform === 'instagram') {
    field(form, t('postAuthorLabel', loc), 'postAuthor').placeholder = '@autor_objave';
    field(form, t('commentIdLabel', loc), 'commentId');
  }
  const post = field(form, t('postLabel', loc), 'postUrl');
  post.placeholder = hints.post;
  field(form, t('textLabel', loc), 'text', 'textarea');
  const file = field(form, t('avatarLabel', loc), 'avatar', 'file');
  file.accept = 'image/png,image/jpeg,image/webp,image/gif';
  form.append(node('p', t('avatarHintForm', loc), 'fineprint'));
  field(form, t('noteLabel', loc), 'note', 'textarea');
  const submit = node('button', t('saveRecord', loc), 'primary');
  submit.type = 'submit';
  form.append(submit);
  form.onsubmit = async e => {
    e.preventDefault();
    submit.disabled = true;
    try {
      const data = new FormData(form);
      const avatar = file.files[0] ? await fingerprintFile(file.files[0]) : null;
      const raw = {
        platform: selectedPlatform,
        _explicitPlatform: selectedPlatform === 'instagram',
        profile: data.get('profile'),
        postUrl: data.get('postUrl'),
        postAuthor: data.get('postAuthor') || null,
        commentId: data.get('commentId') || '',
        text: data.get('text'),
        note: data.get('note'),
        avatar,
        source: 'manual',
        caseId: state.activeCaseId,
        observedAt: new Date().toISOString()
      };
      const merged = mergeRecords(state.records, [raw]);
      if (!merged.added) throw Error('Duplikat.');
      await commit({...state, records: merged.records, reviews: {}});
      message(t('saved', loc));
    } catch (err) { message(err.message, true); } finally { submit.disabled = false; }
  };
  panel.append(form);
  const imports = node('section', undefined, 'panel');
  imports.append(node('h2', t('importTitle', loc)));
  const jsonInput = field(imports, t('jsonImport', loc), 'json-file', 'file');
  jsonInput.accept = '.json,application/json';
  jsonInput.onchange = async () => {
    try {
      const file = jsonInput.files[0];
      if (!file) return;
      const parsed = JSON.parse(await file.text());
      if (parsed?.packageSchema === PACKAGE_SCHEMA && parsed?.purpose === 'share') {
        pending = {kind: 'share', data: parsed, label: t('importShare', loc)};
      } else {
        const result = importState(parsed);
        pending = {kind: 'records', records: result.records.map(r => ({...r, caseId: state.activeCaseId})), errors: result.errors, label: 'JSON'};
      }
      render();
    } catch (e) { message(e.message, true); }
  };
  imports.append(node('p', t('importHint', loc), 'fineprint'));
  const pastePlatform = node('select');
  for (const a of adapters) {
    const opt = node('option', a.name);
    opt.value = a.id;
    pastePlatform.append(opt);
  }
  pastePlatform.value = selectedPlatform;
  const bulk = field(imports, t('pasteLabel', loc), 'bulk', 'textarea');
  bulk.placeholder = hints.paste;
  imports.append(node('label', t('pastePlatform', loc)), pastePlatform);
  imports.append(button(t('previewPaste', loc), () => {
    const records = [], errors = [];
    const plat = pastePlatform.value;
    bulk.value.split(/\r?\n/).filter(s => s.trim()).forEach((line, i) => {
      try {
        const [profile, content, postUrl = ''] = line.split('\t');
        records.push(validateRecord({platform: plat, _explicitPlatform: plat === 'instagram', profile, text: content, postUrl, source: 'paste', caseId: state.activeCaseId}));
      } catch (e) { errors.push(`Red ${i + 1}: ${e.message}`); }
    });
    pending = {kind: 'records', records, errors, label: 'paste'};
    render();
  }));
  imports.append(button(t('importCapture', loc), async () => {
    const batch = await takeCapture();
    if (!batch) throw Error(extensionMode ? 'Nema kolekcije.' : 'Samo u ekstenziji.');
    pending = {kind: 'records', ...batch, records: (batch.records || []).map(r => ({...r, caseId: state.activeCaseId})), errors: []};
    render();
  }));
  imports.append(node('p', t('captureHint', loc), 'fineprint'));
  grid.append(panel, imports);
  main.append(grid);
  if (pending) renderPending(main);
}

function renderPending(main) {
  const loc = locale();
  const panel = node('section', undefined, 'panel');
  panel.append(node('h2', t('importPreview', loc) + ' ' + (pending.label || '')));
  if (pending.kind === 'share') {
    panel.append(node('p', pending.data.records.length + ' zapisa', 'muted'));
    panel.append(button(t('newCaseOnImport', loc), async () => {
      const result = importSharePackage(state, pending.data, {mode: 'new'});
      await commit(result.state);
      pending = null;
      message(t('shareImported', loc) + ` +${result.added}, duplikati: ${result.skipped}`);
    }, 'primary'));
    panel.append(button(t('mergeIntoActive', loc), async () => {
      const result = importSharePackage(state, pending.data, {mode: 'merge'});
      await commit(result.state);
      pending = null;
      message(t('shareImported', loc) + ` +${result.added}`);
    }));
    panel.append(button(t('closePreview', loc), () => { pending = null; render(); }));
    main.append(panel);
    return;
  }
  for (const err of pending.errors || []) panel.append(node('p', err, 'fineprint'));
  if (pending.message) panel.append(node('p', pending.message, 'muted'));
  const choices = [];
  (pending.records || []).forEach((raw, i) => {
    const row = node('div', undefined, 'preview-row');
    const label = node('label');
    const cb = node('input');
    cb.type = 'checkbox'; cb.checked = true; cb.id = 'pending-' + i;
    choices.push({cb, raw});
    label.append(cb, String(raw.profile || raw.profileUrl) + ' — ' + String(raw.text || '(slika)'));
    row.append(label);
    panel.append(row);
  });
  panel.append(
    button(t('saveSelected', loc), async () => {
      const selected = choices.filter(x => x.cb.checked).map(x => x.raw);
      if (!selected.length) throw Error('Izaberi bar jedan.');
      const merged = mergeRecords(state.records, selected);
      await commit({...state, records: merged.records, reviews: {}});
      if (extensionMode && pending.capture) await clearCapture(pending.id);
      pending = null;
      message(`+${merged.added}`);
    }, 'primary'),
    button(t('closePreview', loc), () => { pending = null; render(); })
  );
  main.append(panel);
}

function renderRecords(main) {
  const loc = locale();
  main.append(node('h2', t('recordsTitle', loc)));
  const bar = node('div', undefined, 'row');
  const records = activeRecords();
  bar.append(
    button(t('backupJson', loc), () => download('botanalyzer-backup.json', 'application/json', JSON.stringify(state, null, 2))),
    button(t('exportShare', loc), () => {
      const pkg = buildEvidencePackage(state, analysis, {purpose: 'share', locale: loc});
      download('botanalyzer-share-' + state.activeCaseId.slice(0, 8) + '.json', 'application/json', JSON.stringify(pkg, null, 2));
    }),
    button(t('importShare', loc), () => { active = 'add'; render(); }),
    button(t('csvExport', loc), () => download('botanalyzer-evidence.csv', 'text/csv;charset=utf-8', csv(records))),
    button(t('clearAll', loc), async () => {
      if (confirm('Clear?')) await commit(emptyState());
    }, 'danger')
  );
  main.append(bar);
  if (!records.length) main.append(emptyBox('—'));
  for (const r of [...records].reverse()) {
    const card = node('article', undefined, 'record');
    const head = node('div', undefined, 'row record-head');
    head.append(identity(r), button(t('remove', loc), async () => {
      await commit({...state, records: state.records.filter(x => x.id !== r.id), reviews: {}});
    }));
    card.append(head);
    if (r.text) card.append(node('p', r.text, 'quote'));
    if (r.postAuthor) card.append(node('p', 'Autor objave: ' + r.postAuthor, 'muted'));
    if (r.note) card.append(node('p', r.note, 'muted'));
    card.append(node('p', `${t('observedAt', loc)} ${new Date(r.observedAt).toLocaleString(loc === 'en' ? 'en-GB' : 'sr-RS')} · ${r.source} · ${t('observedHint', loc)}`, 'fineprint'));
    main.append(card);
  }
}

function renderReport(main) {
  const loc = locale();
  const report = buildReport(state, analysis, loc);
  const panel = node('section', undefined, 'panel');
  panel.append(node('h2', t('reportTitle', loc)), node('p', `${report.findings} ${t('reportStats', loc)} ${report.records.length} ${t('examplesWord', loc)}`, 'muted'));
  const text = node('textarea');
  text.className = 'report';
  text.value = report.text;
  panel.append(text);
  const pkg = buildEvidencePackage(state, analysis, {purpose: 'report', locale: loc});
  panel.append(
    button(t('copy', loc), async () => {
      try { await navigator.clipboard.writeText(text.value); message(t('copied', loc)); }
      catch { text.select(); }
    }),
    button(t('downloadTxt', loc), () => download('botanalyzer-report.txt', 'text/plain;charset=utf-8', text.value)),
    button(t('downloadPackage', loc), () => download('botanalyzer-package.json', 'application/json', JSON.stringify(pkg, null, 2)))
  );
  const platforms = [...new Set((pkg.findings || []).map(f => f.platform))];
  if (platforms.length) {
    panel.append(node('h3', t('howToSubmit', loc)));
    for (const platform of platforms) {
      const info = instructions(platform);
      panel.append(node('h4', adapters.find(a => a.id === platform)?.name || platform));
      const ul = node('ol');
      for (const step of info.steps) ul.append(node('li', step));
      panel.append(ul, anchor(info.helpUrl, platform));
      const sub = getSubmission(state, state.activeCaseId, platform);
      panel.append(node('h4', t('submissionStatus', loc)));
      const statusSelect = node('select');
      for (const [val, key] of [['not_sent', 'statusNotSent'], ['marked_sent', 'statusMarkedSent'], ['outcome_noted', 'statusOutcome']]) {
        const opt = node('option', t(key, loc));
        opt.value = val;
        statusSelect.append(opt);
      }
      statusSelect.value = sub.status;
      const noteInput = field(panel, t('outcomeNote', loc), 'outcome-' + platform, 'textarea');
      noteInput.value = sub.outcomeNote || '';
      statusSelect.onchange = noteInput.onchange = async () => {
        await commit(setSubmission(state, state.activeCaseId, platform, statusSelect.value, noteInput.value));
      };
      panel.append(statusSelect, noteInput);
    }
  } else {
    panel.append(node('p', t('reportInstructionsEmpty', loc), 'muted'));
  }
  main.append(panel);
}

function renderHelp(main) {
  const loc = locale();
  const panel = node('section', undefined, 'panel');
  panel.append(node('h2', t('helpTitle', loc)));
  const localeLabel = node('label', t('localeLabel', loc));
  const localeSelect = node('select');
  for (const [val, key] of [['sr', 'localeSr'], ['en', 'localeEn']]) {
    const opt = node('option', t(key, loc));
    opt.value = val;
    localeSelect.append(opt);
  }
  localeSelect.value = loc;
  localeSelect.onchange = async () => {
    await commit({...state, settings: {...state.settings, locale: localeSelect.value}});
  };
  panel.append(localeLabel, localeSelect);
  const nearLabel = node('label', t('nearText', loc));
  const nearCheck = node('input');
  nearCheck.type = 'checkbox';
  nearCheck.checked = state.settings.nearText !== false;
  nearCheck.onchange = async () => {
    await commit({...state, settings: {...state.settings, nearText: nearCheck.checked}, reviews: {}});
  };
  nearLabel.prepend(nearCheck);
  panel.append(nearLabel);
  main.append(panel);
}

try { state = await loadState(); } catch (e) { loadFailed = true; render(); message(e.message, true); }
render();
if (extensionMode) chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.captureBatch?.newValue) message('Nova kolekcija.');
});
