import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import * as React from 'react';

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.[jt]sx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

test('frontend imports only names exported by React (invalid imports blank the whole app before it mounts)', async () => {
  const root = new URL('../apps/web/src/', import.meta.url);
  const directory = decodeURIComponent(root.pathname.replace(/^\/(\w:)/, '$1'));
  const missing = [];
  for (const path of await sourceFiles(directory)) {
    const source = await readFile(path, 'utf8');
    for (const statement of source.matchAll(/\bimport\s+[\s\S]*?\s+from\s+['"]react['"];?/g)) {
      const named = statement[0].match(/\{([^}]+)\}\s*from\s*['"]react['"]/);
      for (const specifier of named?.[1].split(',') ?? []) {
        const exported = specifier.trim().split(/\s+as\s+/)[0];
        if (exported && !Object.hasOwn(React, exported)) missing.push(`${relative(directory, path)} imports missing React export "${exported}"`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
