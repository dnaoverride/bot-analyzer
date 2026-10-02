import {emptyState, mergeRecords, importState, validateRecord, SCHEMA_VERSION} from '../core/model.js';
import {analyze} from '../core/analyze.js';
import {fingerprintFile} from '../core/image.js';
import {buildReport, csv, instructions} from '../core/report.js';
import {loadState, saveState, takeCapture, clearCapture, extensionMode} from '../core/storage.js';
import {listAdapters} from '../adapters/index.js';

let state = emptyState(), active = 'analysis', analysis, pending = null, loadFailed = false;
let selectedPlatform = 'tiktok', platformFilter = 'all';
const adapters = listAdapters();
const root = document.getElementById('app');

const platformHints = {
  tiktok: {
    profile: '@primer123',
    post: 'https://www.tiktok.com/@autor/video/…',
    paste: '@primer123\tTekst komentara\thttps://www.tiktok.com/…'
  },
  instagram: {
    profile: '@korisnik',
    post: 'https://www.instagram.com/p/… ili /reel/…',
    paste: '@korisnik\tTekst komentara\thttps://www.instagram.com/p/…'
  }
};

function node(tag, text, cls) {
  const x = document.createElement(tag);
  if (text !== undefined) x.textContent = text;
  if (cls) x.className = cls;
  return x;
}

function button(text, fn, cls) {
  const b = node('button', text, cls);
  b.type = 'button';
  b.addEventListener('click', async () => {
    b.disabled = true;
    try { await fn(); } catch (e) { message(e.message, true); } finally { b.disabled = false; }
  });
  return b;
}

function anchor(url, text) {
  const a = node('a', text || url);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
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
  if (loadFailed) throw Error('Učitavanje sačuvanih podataka nije uspelo. Izvezi postojeće podatke ili proveri prostor pre novih unosa.');
  await saveState(next);
  state = next;
  render();
}

function download(name, type, value) {
  const url = URL.createObjectURL(new Blob([value], {type}));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function identity(record) {
  const div = node('div', undefined, 'identity');
  if (record.avatar) {
    const img = node('img');
    img.src = record.avatar.thumb;
    img.alt = 'Mali pregled profilne slike';
    img.className = 'avatar';
    div.append(img);
  }
  const col = node('div');
  col.append(node('span', record.platform, 'badge'), anchor(record.profile, '@' + record.handle));
  if (record.postUrl) col.append(node('br'), anchor(record.postUrl, 'Otvori objavu'));
  div.append(col);
  return div;
}

function field(form, labelText, name, type = 'text') {
  const label = node('label', labelText);
  label.htmlFor = name;
  const input = node(type === 'textarea' ? 'textarea' : 'input');
  input.id = name;
  input.name = name;
  if (type !== 'textarea') input.type = type;
  form.append(label, input);
  return input;
}

function empty(text) { return node('div', text, 'empty'); }

function filteredFindings() {
  const all = [...analysis.groups, ...analysis.pairs];
  if (platformFilter === 'all') return all;
  return all.filter(f => f.platform === platformFilter);
}

function render() {
  analysis = analyze(state.records, state.settings);
  root.replaceChildren();
  const header = node('header');
  const top = node('div', undefined, 'topline');
  top.append(node('h1', 'BotAnalyzer'), node('span', 'v0.2.0-beta · lokalno · MIT', 'badge'));
  header.append(top, node('p', 'Tragovi povezane aktivnosti. Dokazi i pregled pre prijave.'));
  root.append(header);
  const main = node('main');
  const status = node('div', undefined, 'status');
  status.id = 'status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  main.append(status);
  const stats = node('div', undefined, 'stats');
  for (const [n, label] of [
    [state.records.length, 'sačuvanih primera'],
    [new Set(state.records.map(r => r.platform + '|' + r.profile.toLowerCase())).size, 'različitih profila'],
    [analysis.pairs.filter(p => p.priority === 'multiple').length, 'parova sa više tragova']
  ]) {
    const card = node('div', undefined, 'stat');
    card.append(node('strong', String(n)), node('span', label, 'muted'));
    stats.append(card);
  }
  main.append(stats);
  const tabs = node('nav', undefined, 'tabs');
  tabs.setAttribute('aria-label', 'Glavni prikazi');
  for (const [id, title] of [['analysis', 'Analiza'], ['add', 'Dodaj / uvezi'], ['records', 'Evidencija'], ['report', 'Prijava'], ['help', 'Uputstvo']]) {
    const b = button(title, () => { active = id; render(); });
    b.setAttribute('aria-selected', String(active === id));
    tabs.append(b);
  }
  main.append(tabs);
  if (active === 'analysis') renderAnalysis(main);
  if (active === 'add') renderAdd(main);
  if (active === 'records') renderRecords(main);
  if (active === 'report') renderReport(main);
  if (active === 'help') renderHelp(main);
  root.append(main, node('footer', 'Bez ocenjivanja političkih stavova. Bez automatskih prijava. Bez slanja podataka na server.'));
}

function reviewControl(f) {
  const div = node('div', undefined, 'review'), label = node('label', 'Tvoj pregled');
  label.htmlFor = 'review-' + f.id;
  const select = node('select');
  select.id = label.htmlFor;
  for (const [value, text] of [['pending', 'Nije pregledano'], ['include', 'Uključi u nacrt prijave'], ['dismiss', 'Odbaci kao nedovoljan trag']]) {
    const opt = node('option', text);
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
  main.append(node('h2', 'Nalazi za ručni pregled'), node('p', 'Više nezavisnih tragova povećava prioritet za pregled. Ovo nije procenat verovatnoće da je nalog bot.', 'muted'));
  const filterRow = node('div', undefined, 'row');
  const filterLabel = node('label', 'Filter mreže');
  filterLabel.htmlFor = 'platform-filter';
  const filterSelect = node('select');
  filterSelect.id = 'platform-filter';
  for (const [value, text] of [['all', 'Sve mreže'], ...adapters.map(a => [a.id, a.name])]) {
    const opt = node('option', text);
    opt.value = value;
    filterSelect.append(opt);
  }
  filterSelect.value = platformFilter;
  filterSelect.onchange = () => { platformFilter = filterSelect.value; render(); };
  filterRow.append(filterLabel, filterSelect);
  main.append(filterRow);
  for (const w of analysis.warnings) main.append(node('p', w, 'status error'));
  if (!state.records.length) {
    main.append(empty('Dodaj nekoliko primera ili uvezi podatke da započneš analizu.'));
    return;
  }
  const findings = filteredFindings();
  if (!findings.length) main.append(empty('Nema poklapanja za izabrani filter ili po trenutnim pravilima.'));
  for (const f of findings) {
    const card = node('article', undefined, 'finding' + (f.priority === 'multiple' ? ' priority' : ''));
    card.append(node('h3', f.title), node('span', f.platform, 'badge'));
    if (f.explanation) card.append(node('p', f.explanation, 'muted'));
    if (f.signals) {
      card.append(node('span', `${f.signals.length} ${f.signals.length === 1 ? 'trag' : 'traga'}`, 'badge'));
      for (const s of f.signals) {
        const div = node('div', undefined, 'signal');
        div.append(node('strong', s.label), node('p', s.detail, 'muted'));
        card.append(div);
      }
    }
    const detail = document.createElement('details');
    detail.append(node('summary', 'Pogledaj sačuvane primere'));
    for (const id of f.recordIds) {
      const r = state.records.find(x => x.id === id);
      if (r) detail.append(recordPreview(r), node('hr'));
    }
    card.append(detail, reviewControl(f));
    main.append(card);
  }
}

function renderAdd(main) {
  const grid = node('div', undefined, 'grid'), panel = node('section', undefined, 'panel'), form = node('form');
  const adapter = adapters.find(a => a.id === selectedPlatform) || adapters[0];
  panel.append(node('h2', 'Ručni unos — ' + adapter.name));
  const platformLabel = node('label', 'Mreža');
  platformLabel.htmlFor = 'platform-select';
  const platformSelect = node('select');
  platformSelect.id = 'platform-select';
  platformSelect.name = 'platform';
  for (const a of adapters) {
    const opt = node('option', a.name);
    opt.value = a.id;
    platformSelect.append(opt);
  }
  platformSelect.value = selectedPlatform;
  platformSelect.onchange = () => { selectedPlatform = platformSelect.value; render(); };
  panel.append(platformLabel, platformSelect);
  const hints = platformHints[selectedPlatform] || platformHints.tiktok;
  const profile = field(form, 'Profil ili @korisničko_ime *', 'profile');
  profile.required = true;
  profile.placeholder = hints.profile;
  const post = field(form, 'Link objave', 'postUrl');
  post.placeholder = hints.post;
  field(form, 'Tekst komentara', 'text', 'textarea');
  const file = field(form, 'Isečena profilna slika (opciono)', 'avatar', 'file');
  file.accept = 'image/png,image/jpeg,image/webp,image/gif';
  form.append(node('p', 'Dodaj komentar ili sliku. Za poređenje slika koristi samo avatar, bez okvira cele stranice.', 'fineprint'));
  field(form, 'Napomena', 'note', 'textarea');
  const submit = node('button', 'Sačuvaj primer', 'primary');
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
        text: data.get('text'),
        note: data.get('note'),
        avatar,
        source: 'manual',
        observedAt: new Date().toISOString()
      };
      const merged = mergeRecords(state.records, [raw]);
      if (!merged.added) throw Error('Ovaj primer je već sačuvan.');
      await commit({...state, records: merged.records, reviews: {}});
      message('Sačuvano. Otvori Analiza da pregledaš poklapanja.');
    } catch (err) { message(err.message, true); } finally { submit.disabled = false; }
  };
  panel.append(form);
  const imports = node('section', undefined, 'panel');
  imports.append(node('h2', 'Uvoz i rezervne kopije'));
  const input = field(imports, 'JSON fajl (podržani i stari tiktok-dokazi unosi)', 'json-file', 'file');
  input.accept = '.json,application/json';
  input.onchange = async () => {
    try {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) throw Error('JSON je veći od 25 MB.');
      const result = importState(JSON.parse(await file.text()));
      pending = {id: 'file-' + Date.now(), records: result.records, errors: result.errors, label: result.legacy ? 'Stara evidencija' : 'JSON uvoz'};
      render();
    } catch (e) { message(e.message, true); }
  };
  imports.append(node('p', 'Uvoz ne preuzima tuđe odluke o prijavljivanju. Nalaze ponovo pregledaš.', 'fineprint'));
  const pastePlatformLabel = node('label', 'Mreža za nalepljene redove');
  pastePlatformLabel.htmlFor = 'paste-platform';
  const pastePlatform = node('select');
  pastePlatform.id = 'paste-platform';
  for (const a of adapters) {
    const opt = node('option', a.name);
    opt.value = a.id;
    pastePlatform.append(opt);
  }
  pastePlatform.value = selectedPlatform;
  const text = field(imports, 'Nalepi redove: profil[TAB]komentar[TAB]link_objave', 'bulk', 'textarea');
  text.placeholder = hints.paste;
  imports.append(pastePlatformLabel, pastePlatform);
  imports.append(button('Pregledaj nalepljene redove', () => {
    const records = [], errors = [];
    const plat = pastePlatform.value;
    text.value.split(/\r?\n/).filter(s => s.trim()).forEach((line, i) => {
      try {
        const [profile, content, postUrl = ''] = line.split('\t');
        records.push(validateRecord({
          platform: plat,
          _explicitPlatform: plat === 'instagram',
          profile,
          text: content,
          postUrl,
          source: 'paste'
        }));
      } catch (e) { errors.push(`Red ${i + 1}: ${e.message}`); }
    });
    pending = {id: 'paste-' + Date.now(), label: 'Nalepljeni redovi', records, errors};
    render();
  }));
  imports.append(button('Uvezi poslednju kolekciju iz dodatka', async () => {
    const batch = await takeCapture();
    if (!batch) throw Error(extensionMode ? 'Nema nove kolekcije.' : 'Ova opcija radi u kontrolnoj tabli Chrome dodatka.');
    pending = {...batch, label: batch.label || 'Učitani komentari', errors: []};
    render();
  }));
  imports.append(node('p', 'Prikupljanje iz dodatka trenutno podržava samo TikTok (eksperimentalno). Instagram koristi ručni unos ili uvoz.', 'fineprint'));
  grid.append(panel, imports);
  main.append(grid);
  if (pending) renderPending(main);
}

function renderPending(main) {
  const panel = node('section', undefined, 'panel');
  panel.append(node('h2', 'Pregled pre uvoza: ' + pending.label));
  for (const err of pending.errors || []) panel.append(node('p', err, 'fineprint'));
  if (pending.message) panel.append(node('p', pending.message, 'muted'));
  if (!pending.records.length) {
    panel.append(empty('Nema validnih komentara. Proveri format ili vidljivost komentara na stranici.'));
  }
  const choices = [];
  pending.records.forEach((raw, i) => {
    const row = node('div', undefined, 'preview-row'), label = node('label'), cb = node('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.id = 'pending-' + i;
    choices.push({cb, raw});
    label.append(cb, String(raw.profile || raw.profileUrl) + ' — ' + String(raw.text || raw.comment || '(slika)'));
    row.append(label);
    panel.append(row);
  });
  panel.append(
    button('Sačuvaj izabrane primere', async () => {
      const selected = choices.filter(x => x.cb.checked).map(x => x.raw);
      if (!selected.length) throw Error('Izaberi najmanje jedan primer.');
      const merged = mergeRecords(state.records, selected);
      const batchId = pending.id, isCapture = pending.capture;
      await commit({...state, records: merged.records, reviews: {}});
      if (extensionMode && isCapture) await clearCapture(batchId);
      pending = null;
      render();
      message(`Dodato ${merged.added} novih primera. Ponovljeni unosi su preskočeni.`);
    }, 'primary'),
    button('Zatvori pregled', () => { pending = null; render(); })
  );
  main.append(panel);
}

function renderRecords(main) {
  main.append(node('h2', 'Evidencija'));
  const bar = node('div', undefined, 'row');
  bar.append(
    button('JSON rezervna kopija', () => download('botanalyzer-backup.json', 'application/json', JSON.stringify(state, null, 2))),
    button('CSV pregled', () => download('botanalyzer-evidence.csv', 'text/csv;charset=utf-8', csv(state.records))),
    button('Obriši lokalnu evidenciju', async () => {
      if (confirm('Obrisati lokalne primere i odluke? Sačuvaj JSON rezervnu kopiju ako ti trebaju.')) await commit(emptyState());
    }, 'danger')
  );
  main.append(bar);
  if (!state.records.length) main.append(empty('Nema sačuvanih primera.'));
  for (const r of [...state.records].reverse()) {
    const card = node('article', undefined, 'record'), head = node('div', undefined, 'row record-head');
    head.append(identity(r), button('Ukloni', async () => {
      await commit({...state, records: state.records.filter(x => x.id !== r.id), reviews: {}});
    }));
    card.append(head);
    if (r.text) card.append(node('p', r.text, 'quote'));
    if (r.note) card.append(node('p', r.note, 'muted'));
    card.append(node('p', `Zabeleženo: ${new Date(r.observedAt).toLocaleString('sr-RS')} · ${r.source} · vreme prikupljanja, ne objave`, 'fineprint'));
    main.append(card);
  }
}

function renderReport(main) {
  const report = buildReport(state, analysis), panel = node('section', undefined, 'panel');
  panel.append(node('h2', 'Nacrt za proveru platforme'), node('p', `${report.findings} pregledanih nalaza · ${report.records.length} primera`, 'muted'));
  const text = node('textarea');
  text.className = 'report';
  text.value = report.text;
  text.setAttribute('aria-label', 'Nacrt prijave');
  panel.append(text);
  panel.append(
    button('Kopiraj', async () => {
      try { await navigator.clipboard.writeText(text.value); message('Kopirano.'); }
      catch { text.focus(); text.select(); message('Tekst je označen; pritisni Ctrl+C.'); }
    }),
    button('Preuzmi nacrt TXT', () => download('botanalyzer-report.txt', 'text/plain;charset=utf-8', text.value)),
    button('Dokazi JSON', () => download('botanalyzer-report-evidence.json', 'application/json', JSON.stringify({schemaVersion: SCHEMA_VERSION, records: report.records}, null, 2)))
  );
  const included = [...analysis.groups, ...analysis.pairs].filter(f => state.reviews[f.id] === 'include');
  const platforms = [...new Set(included.map(f => f.platform))];
  if (platforms.length) {
    panel.append(node('h3', 'Kako da pošalješ'));
    for (const platform of platforms) {
      const info = instructions(platform);
      const adapter = adapters.find(a => a.id === platform);
      panel.append(node('h4', adapter?.name || platform));
      const ul = node('ol');
      for (const step of info.steps) ul.append(node('li', step));
      panel.append(ul, anchor(info.helpUrl, (adapter?.name || platform) + ' uputstvo za prijavu'));
    }
  } else {
    panel.append(node('p', 'Označi nalaze u Analizi opcijom „Uključi u nacrt prijave“ da bi se prikazala uputstva po mreži.', 'muted'));
  }
  main.append(panel);
}

function renderHelp(main) {
  const panel = node('section', undefined, 'panel');
  panel.append(node('h2', 'Brzi početak'));
  const ul = node('ol');
  for (const text of [
    'Izaberi mrežu (TikTok ili Instagram) u Dodaj / uvezi.',
    'Otvori objavu na računaru i prikaži komentare (TikTok) ili unesi podatke ručno (Instagram).',
    'Za TikTok: klikni ikonicu BotAnalyzer dodatka da prikupiš trenutno vidljive komentare. Nema automatskog skrolovanja.',
    'U kontrolnoj tabli otvori Dodaj / uvezi → Uvezi poslednju kolekciju ili ručni unos. Pregledaj pa sačuvaj.',
    'Za profilne slike dodaj isečen avatar ručnim unosom pod istim profilom.',
    'Otvori Analiza, pregledaj originale i označi opravdane nalaze. Koristi filter mreže po potrebi.',
    'U Prijava preuzmi nacrt i dokaze; prijavu pošalji kroz odgovarajuću mrežu.'
  ]) ul.append(node('li', text));
  panel.append(
    ul,
    node('h3', 'Šta analiza znači'),
    node('p', 'Identičan komentar, zajednička slika ili slično ime mogu imati potpuno normalno objašnjenje. Privatni profil i politički stav se ne koriste kao signali. Vreme prikupljanja se nikada ne tretira kao vreme objave. Sličnost slika nije prepoznavanje lica. TikTok i Instagram profile se ne spajaju kao ista osoba.', 'muted'),
    node('h3', 'Ograničenja'),
    node('p', 'TikTok prikupljanje komentara je eksperimentalno. Instagram nema automatski collector u ovoj verziji — samo ručni unos i uvoz. Prikupljaju se samo učitani komentari u vidljivom delu stranice. Nema dokaza da je nalog kupljen.', 'muted')
  );
  const label = node('label', 'Poredi i veoma slične tekstove');
  const check = node('input');
  check.type = 'checkbox';
  check.checked = state.settings.nearText !== false;
  check.onchange = async () => {
    try { await commit({...state, settings: {...state.settings, nearText: check.checked}, reviews: {}}); }
    catch (e) { message(e.message, true); }
  };
  label.prepend(check);
  panel.append(label, node('p', 'Podaci iz samostalne aplikacije i kontrolne table dodatka čuvaju se odvojeno. Prenosi ih JSON uvozom/izvozom.', 'fineprint'));
  main.append(panel);
}

try { state = await loadState(); } catch (e) { loadFailed = true; render(); message(e.message, true); }
render();
if (loadFailed) message('Učitavanje podataka nije uspelo; novi unos je privremeno blokiran.', true);
if (extensionMode) chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.captureBatch?.newValue) message('Nova kolekcija je spremna u Dodaj / uvezi.');
});
