import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../apps/extension/src/popup.js', import.meta.url), 'utf8');
function popup({ ping, tabs, reply, create } = {}) {
  const elements = Object.fromEntries(['#worker', '#problem', '#refresh', '#record', '#launch-status'].map((key) => [key, {
    textContent: '', disabled: false, addEventListener(_event, listener) { this.click = listener; },
  }]));
  const messages = [];
  const opened = [];
  const context = vm.createContext({
    URL, window: { close() {} },
    document: { querySelector: (selector) => elements[selector] },
    chrome: {
      runtime: { sendMessage: ping || (async () => ({ status: 'worker-ready', version: '0.1.0' })) },
      tabs: {
        create: async (options) => { if (create) await create(options); opened.push(options.url); },
        query: tabs || (async () => [{ id: 123 }]),
        sendMessage: async (id, message) => {
          messages.push({ id, type: message.type });
          if (message.type === 'SHOW_RECORDER') { if (create) await create(); opened.push(id); return { opened: true }; }
          return reply ? reply() : { status: 'content-script-ready', problem: { platform: 'leetcode', problemId: 'two-sum', url: 'https://leetcode.com/problems/two-sum/' } };
        },
      },
    },
  });
  vm.runInContext(readFileSync(new URL('../apps/extension/src/adapters/leetcode.js', import.meta.url), 'utf8'), context);
  const ready = vm.runInContext(source, context);
  return { elements, messages, opened, ready };
}

test('popup proves both worker and content-script messaging', async () => {
  const ui = popup();
  assert.equal(ui.elements['#refresh'].disabled, true);
  await ui.ready;
  assert.equal(ui.elements['#worker'].textContent, 'Extension loaded · v0.1.0');
  assert.equal(ui.elements['#problem'].textContent, 'two-sum');
  assert.deepEqual(ui.messages, [{ id: 123, type: 'GET_CURRENT_PROBLEM' }]);
  assert.equal(ui.elements['#refresh'].disabled, false);
});

test('popup can recover when a content script becomes available after page refresh', async () => {
  let available = false;
  const ui = popup({ reply: async () => {
    if (!available) throw new Error('Receiving end does not exist');
    return { status: 'content-script-ready', problem: { platform: 'leetcode', problemId: 'valid-parentheses', url: 'https://leetcode.com/problems/valid-parentheses/' } };
  } });
  await ui.ready;
  assert.match(ui.elements['#problem'].textContent, /refresh that page/);
  assert.equal(ui.elements['#refresh'].disabled, false);
  available = true;
  await ui.elements['#refresh'].click();
  assert.equal(ui.elements['#problem'].textContent, 'valid-parentheses');
});

test('popup recognizes a valid response on a non-problem LeetCode page', async () => {
  const ui = popup({ reply: async () => ({ status: 'content-script-ready', problem: null }) });
  await ui.ready;
  assert.match(ui.elements['#problem'].textContent, /^Content script ready/);
});

for (const reply of [undefined, {}, { status: 'wrong', problem: null }, { status: 'content-script-ready', problem: {} }]) {
  test(`popup does not claim readiness for a malformed reply: ${JSON.stringify(reply)}`, async () => {
    const ui = popup({ reply: async () => reply });
    await ui.ready;
    assert.match(ui.elements['#problem'].textContent, /Unexpected reply/);
    assert.equal(ui.elements['#refresh'].disabled, false);
  });
}

test('worker failure does not prevent checking the current page', async () => {
  const ui = popup({ ping: async () => { throw new Error('Worker unavailable'); } });
  await ui.ready;
  assert.match(ui.elements['#worker'].textContent, /Could not reach/);
  assert.equal(ui.elements['#problem'].textContent, 'two-sum');
});

test('no active tab gives guidance and leaves retry enabled', async () => {
  const ui = popup({ tabs: async () => [] });
  await ui.ready;
  assert.match(ui.elements['#problem'].textContent, /Open a problem/);
  assert.equal(ui.elements['#refresh'].disabled, false);
});

test('a retry clears the previous problem while checking another tab', async () => {
  let resolvePing;
  let pending = false;
  const ui = popup({ ping: () => pending
    ? new Promise((resolve) => { resolvePing = resolve; })
    : Promise.resolve({ status: 'worker-ready', version: '0.1.0' }) });
  await ui.ready;
  pending = true;
  const retry = ui.elements['#refresh'].click();
  assert.equal(ui.elements['#refresh'].disabled, true);
  assert.equal(ui.elements['#problem'].textContent, 'Checking this tab…');
  resolvePing({ status: 'worker-ready', version: '0.1.0' });
  await retry;
});

test('record opens the panel on the active tab without a dashboard tab', async () => {
  const ui = popup();
  await ui.ready;
  assert.equal(ui.opened.length, 0);
  assert.equal(ui.elements['#record'].disabled, false);
  await ui.elements['#record'].click();
  assert.deepEqual(ui.opened, [123]);
  assert.equal(ui.messages.at(-1).type,'SHOW_RECORDER');
});

test('record reads the latest SPA problem rather than the earlier popup identity', async () => {
  let slug = 'two-sum';
  const ui = popup({ reply: async () => ({ status: 'content-script-ready', problem: { platform: 'leetcode', problemId: slug, url: `https://leetcode.com/problems/${slug}/description/?test=1` } }) });
  await ui.ready;
  slug = 'valid-parentheses';
  await ui.elements['#record'].click();
  assert.equal(ui.elements['#problem'].textContent, 'valid-parentheses');
  assert.equal(ui.messages.at(-1).type,'SHOW_RECORDER');
});

test('navigation away from a problem prevents opening a stale draft', async () => {
  let away = false;
  const ui = popup({ reply: async () => ({ status: 'content-script-ready', problem: away ? null : { platform: 'leetcode', problemId: 'two-sum', url: 'https://leetcode.com/problems/two-sum/' } }) });
  await ui.ready;
  away = true;
  await ui.elements['#record'].click();
  assert.equal(ui.opened.length, 0);
  assert.equal(ui.elements['#record'].disabled, true);
  assert.equal(ui.elements['#refresh'].disabled, false);
});

test('untrusted or mismatched identities cannot enable recording', async () => {
  for (const problem of [
    { platform: 'leetcode', problemId: 'two-sum', url: 'https://evil.example/problems/two-sum/' },
    { platform: 'leetcode', problemId: 'wrong', url: 'https://leetcode.com/problems/two-sum/' },
    { platform: 'other', problemId: 'two-sum', url: 'https://leetcode.com/problems/two-sum/' },
    { platform: 'leetcode', problemId: 'two-sum', url: 'https://user:pass@leetcode.com/problems/two-sum/' },
  ]) {
    const ui = popup({ reply: async () => ({ status: 'content-script-ready', problem }) });
    await ui.ready;
    await ui.elements['#record'].click();
    assert.equal(ui.elements['#record'].disabled, true);
    assert.equal(ui.opened.length, 0);
  }
});

test('rapid record clicks open one panel and messaging errors allow recovery', async () => {
  let fail = true;
  const ui = popup({ create: async () => { if (fail) throw new Error('Cannot create tab'); } });
  await ui.ready;
  await ui.elements['#record'].click();
  assert.equal(ui.opened.length, 0);
  assert.match(ui.elements['#launch-status'].textContent, /Could not open/);
  fail = false;
  await ui.elements['#refresh'].click();
  await Promise.all([ui.elements['#record'].click(), ui.elements['#record'].click()]);
  assert.equal(ui.opened.length, 1);
});
