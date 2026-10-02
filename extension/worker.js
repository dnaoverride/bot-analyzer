import {getAdapterForHost} from '../src/adapters/index.js';
import {captureTikTokVisible} from '../src/adapters/tiktok-capture.js';

const collectors = new Map([['tiktok', captureTikTokVisible]]);

async function openDashboard() {
  await chrome.runtime.openOptionsPage();
}

chrome.action.onClicked.addListener(async tab => {
  try {
    const host = new URL(tab.url || 'about:blank').hostname;
    const adapter = getAdapterForHost(host);
    if (adapter?.capabilities?.visibleComments && collectors.has(adapter.id)) {
      const func = collectors.get(adapter.id);
      const results = await chrome.scripting.executeScript({target: {tabId: tab.id}, func});
      const result = results[0]?.result || {records: [], message: 'Prikupljanje nije uspelo.'};
      const {captureBatch: previous} = await chrome.storage.local.get('captureBatch');
      const records = [...(previous?.records || []), ...result.records];
      const unique = [...new Map(records.map(r => [JSON.stringify([r.profile, r.postUrl, r.text]), r])).values()];
      if (unique.length > 1000) throw Error('Kolekcija ima više od 1000 komentara. Uvezi postojeću pre novog prikupljanja.');
      await chrome.storage.local.set({
        captureBatch: {
          id: crypto.randomUUID(),
          capture: true,
          records: unique,
          message: result.message,
          label: 'Učitani ' + adapter.name + ' komentari'
        }
      });
      await chrome.action.setBadgeText({text: String(unique.length)});
    }
    await openDashboard();
  } catch (e) {
    const {captureBatch: previous} = await chrome.storage.local.get('captureBatch');
    await chrome.storage.local.set({
      captureBatch: {
        id: crypto.randomUUID(),
        capture: true,
        records: previous?.records || [],
        message: e.message,
        label: 'Greška prikupljanja — prethodni primeri su sačuvani'
      }
    });
    await openDashboard();
  }
});
