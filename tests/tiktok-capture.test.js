import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {captureTikTokVisible} from '../src/adapters/tiktok-capture.js';

function installDom(html) {
  const {JSDOM} = awaitImport();
  if (JSDOM) {
    const dom = new JSDOM(html, {url: 'https://www.tiktok.com/@host/video/999'});
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.location = dom.window.location;
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
    globalThis.innerHeight = 800;
    globalThis.innerWidth = 1200;
    return () => { delete globalThis.window; delete globalThis.document; delete globalThis.location; };
  }
  return manualDom(html);
}

function awaitImport() {
  try { return {JSDOM: null}; } catch { return {JSDOM: null}; }
}

function manualDom(html) {
  const items = [];
  const authorRe = /href="\/@([\w.]+)"/g;
  const textRe = /data-e2e="comment-text">([^<]+)</g;
  const authors = [...html.matchAll(authorRe)].map(m => m[1]);
  const texts = [...html.matchAll(textRe)].map(m => m[1]);
  for (let i = 0; i < texts.length; i++) {
    items.push({author: authors[i] || null, text: texts[i]});
  }
  globalThis.location = {hostname: 'www.tiktok.com', href: 'https://www.tiktok.com/@host/video/999', origin: 'https://www.tiktok.com'};
  globalThis.innerHeight = 800;
  globalThis.innerWidth = 1200;
  globalThis.getComputedStyle = () => ({visibility: 'visible', display: 'block'});
  const elements = items.map((item, idx) => {
    const textNode = {
      textContent: item.text,
      contains: () => false,
      closest: () => container,
      parentElement: null,
      getBoundingClientRect: () => ({width: 100, height: 20, top: 10, left: 10, bottom: 30, right: 110})
    };
    const authorLink = item.author ? {
      getAttribute: (a) => a === 'href' ? '/@' + item.author : null,
      contains: () => false,
      getBoundingClientRect: () => ({width: 50, height: 20, top: 10, left: 10, bottom: 30, right: 60})
    } : null;
    const container = {
      querySelector: (sel) => {
        if (sel.includes('comment-username') && authorLink) return authorLink;
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel.includes('a[href*="/@"]') && authorLink) return [authorLink];
        if (sel.includes('comment-text')) return [textNode];
        return [];
      }
    };
    textNode.closest = () => container;
    return textNode;
  });
  globalThis.document = {
    querySelectorAll: (sel) => {
      if (sel.includes('comment-text') || sel.includes('comment-level')) return elements;
      return [];
    }
  };
  return () => { delete globalThis.document; delete globalThis.location; };
}

test('tiktok capture skips comment without reliable author', () => {
  const html = readFileSync(new URL('./fixtures/tiktok-comment.html', import.meta.url), 'utf8');
  const cleanup = manualDom(html);
  try {
    const result = captureTikTokVisible();
    assert.ok(result.records.length >= 1);
    assert.ok(result.records.some(r => r.profile.includes('pouzdan_autor')));
    assert.ok(!result.records.some(r => r.text.includes('bez pouzdanog autora')));
  } finally { cleanup(); }
});
