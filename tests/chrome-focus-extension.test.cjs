const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', 'chrome-focus-extension');

function loadWorker(tabsById, windowsById) {
  const listeners = {};
  const sent = [];
  const chrome = {
    runtime: { onMessage: { addListener(fn) { listeners.message = fn; } } },
    tabs: {
      get: async id => tabsById.get(id),
      sendMessage: async (id, message) => { sent.push({ id, message }); },
      onActivated: { addListener(fn) { listeners.activated = fn; } },
      onRemoved: { addListener(fn) { listeners.removed = fn; } }
    },
    windows: {
      get: async id => windowsById.get(id),
      onFocusChanged: { addListener(fn) { listeners.focusChanged = fn; } }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), { chrome });
  return { listeners, sent };
}

function query(worker, id) {
  return new Promise(resolve => worker.listeners.message(
    { type: 'tm-focus-query' }, { tab: { id } }, resolve));
}

test('extension reports foreground only for active tab in focused window', async () => {
  const tabs = new Map([[1, { id: 1, windowId: 10, active: true }],
    [2, { id: 2, windowId: 10, active: false }],
    [3, { id: 3, windowId: 11, active: true }]]);
  const windows = new Map([[10, { id: 10, focused: true }],
    [11, { id: 11, focused: false }]]);
  const worker = loadWorker(tabs, windows);
  assert.equal((await query(worker, 1)).foreground, true);
  assert.equal((await query(worker, 2)).foreground, false);
  assert.equal((await query(worker, 3)).foreground, false);
  tabs.get(1).active = false;
  tabs.get(2).active = true;
  worker.listeners.activated({ tabId: 2, windowId: 10 });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(worker.sent.some(item => item.id === 1 && item.message.type === 'tm-focus-changed'));
  assert.equal((await query(worker, 2)).foreground, true);
  windows.get(10).focused = false;
  worker.listeners.focusChanged(-1);
  assert.equal((await query(worker, 2)).foreground, false);
});

test('content script publishes only focus and refresh time on the Klingo document', async () => {
  const attributes = new Map();
  let refresh;
  let foreground = false;
  const document = { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } };
  const chrome = { runtime: {
    sendMessage: async () => ({ foreground }),
    onMessage: { addListener(fn) { refresh = fn; } }
  } };
  const intervals = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), {
    chrome, document, Date: { now: () => 123456 }, setInterval: fn => intervals.push(fn)
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(attributes.get('data-tm-chrome-foreground'), 'false');
  assert.equal(attributes.get('data-tm-chrome-focus-at'), '123456');
  foreground = true;
  refresh({ type: 'tm-focus-changed' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(attributes.get('data-tm-chrome-foreground'), 'true');
  assert.equal(intervals.length, 1);
});

test('manifest injects only into Samec Klingo and asks for no broad permissions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://samec.klingo.app/*']);
  assert.equal(manifest.permissions?.includes('tabs') || false, false);
  assert.equal(manifest.host_permissions?.includes('https://*/*') || false, false);
});
