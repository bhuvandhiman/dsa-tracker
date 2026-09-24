import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../apps/extension/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

function loadContent(href) {
  let listener;
  const context = vm.createContext({
    URL, location: { href },
    document: { querySelectorAll: () => [], addEventListener() {}, documentElement: {} },
    window: { addEventListener() {} },
    MutationObserver: class { observe() {} },
    chrome: { runtime: { onMessage: { addListener(fn) { listener = fn; } } } },
  });
  for (const script of manifest.content_scripts[0].js) vm.runInContext(read(script), context);
  return { context, send(message) {
    let response;
    listener(message, {}, (value) => { response = JSON.parse(JSON.stringify(value)); });
    return response;
  } };
}
test('manifest uses MV3, restricted host access and existing local entry points', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.type, 'module');
  assert.equal(manifest.content_scripts.length, 1);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://leetcode.com/*']);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['http://127.0.0.1/*', 'https://leetcode.com/*']);
  for (const path of [manifest.background.service_worker, manifest.action.default_popup, ...manifest.content_scripts[0].js]) {
    assert.ok(existsSync(new URL(path, root)), path);
  }
  assert.ok(read('popup.html').includes('src="src/popup.js"'));
  assert.ok(existsSync(new URL('src/popup.js', root)));
});
test('content script normalizes identity and reads the current SPA URL on demand', () => {
  const content = loadContent('https://leetcode.com/problems/two-sum/description/?envId=test#example');
  assert.deepEqual(content.send({ type: 'GET_CURRENT_PROBLEM' }), {
    status: 'content-script-ready',
    problem: { platform: 'leetcode', problemId: 'two-sum', url: 'https://leetcode.com/problems/two-sum/' },
  });
  content.context.location.href = 'https://leetcode.com/problems/valid-parentheses/';
  assert.equal(content.send({ type: 'GET_CURRENT_PROBLEM' }).problem.problemId, 'valid-parentheses');
  assert.equal(content.send({ type: 'UNKNOWN' }), undefined);
});
test('adapter rejects non-problem pages and other hosts', () => {
  for (const url of ['https://leetcode.com/problemset/', 'https://leetcode.com/problems/', 'https://leetcode.com.evil.test/problems/two-sum/', 'https://codeforces.com/problemset/problem/1/A', 'http://leetcode.com/problems/two-sum/', 'not-a-url']) {
    assert.equal(loadContent(url).send({ type: 'GET_CURRENT_PROBLEM' }).problem, null, url);
  }
});
test('service worker responds to a popup ping', () => {
  let listener;
  let response;
  vm.runInNewContext(read(manifest.background.service_worker).replace(/^import .*;\r?$/gm, ''), {
    chrome: { runtime: {
      getManifest: () => manifest,
      onMessage: { addListener(fn) { listener = fn; } },
    } },
  });
  listener({ type: 'PING' }, {}, (value) => { response = JSON.parse(JSON.stringify(value)); });
  assert.deepEqual(response, { status: 'worker-ready', version: manifest.version });
  for (const message of [null, undefined, {}, 'PING']) {
    assert.doesNotThrow(() => listener(message, {}, () => assert.fail('Unexpected response')));
  }
});

test('content script ignores malformed messages', () => {
  const content = loadContent('https://leetcode.com/problems/two-sum/');
  for (const message of [null, undefined, {}, 'GET_CURRENT_PROBLEM']) {
    assert.equal(content.send(message), undefined);
  }
});
