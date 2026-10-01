import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function fixture(storage) {
  const listeners=new Map(),attributes=new Map();
  const doc={createElementNS:()=>({setAttribute(){},append(){}})};
  const root={ownerDocument:doc,setAttribute:(key,value)=>attributes.set(key,value),getAttribute:key=>attributes.get(key)};
  const button={setAttribute:(key,value)=>attributes.set('button-'+key,value),replaceChildren(){},addEventListener:(key,listener)=>listeners.set(key,listener),removeEventListener:key=>listeners.delete(key)};
  const context=vm.createContext({chrome:storage ? {storage} : undefined});
  vm.runInContext(readFileSync(new URL('../apps/extension/src/theme.js',import.meta.url),'utf8'),context);
  return {root,button,attributes,listeners,theme:context.DsaTheme};
}

test('extension theme works without storage and uses accessible action labels',()=>{
  const {theme,root,button,attributes,listeners}=fixture();
  const dispose=theme.init(root,button);
  assert.equal(attributes.get('data-theme'),'light');
  assert.equal(attributes.get('button-aria-label'),'Switch to dark mode');
  listeners.get('click')();
  assert.equal(attributes.get('data-theme'),'dark');
  assert.equal(attributes.get('button-aria-label'),'Switch to light mode');
  dispose();assert.equal(listeners.size,0);
});

test('a delayed saved preference cannot undo a new user choice',async()=>{
  let resolve;const writes=[];
  const storage={local:{get:()=>new Promise(done=>{resolve=done;}),set:async value=>{writes.push(value.recallTheme);}}};
  const {theme,root,button,attributes,listeners}=fixture(storage);
  theme.init(root,button);listeners.get('click')();resolve({recallTheme:'light'});
  await Promise.resolve();
  assert.equal(attributes.get('data-theme'),'dark');assert.deepEqual(writes,['dark']);
});

test('extension surfaces synchronize theme and dispose storage listeners when closed',async()=>{
  const active=new Set();
  const storage={local:{get:async()=>({recallTheme:'dark'})},onChanged:{addListener:listener=>active.add(listener),removeListener:listener=>active.delete(listener)}};
  const {theme,root,button,attributes}=fixture(storage);
  const dispose=theme.init(root,button);await Promise.resolve();
  assert.equal(attributes.get('data-theme'),'dark');
  for(const listener of active)listener({recallTheme:{newValue:'light'}},'local');
  assert.equal(attributes.get('data-theme'),'light');
  dispose();assert.equal(active.size,0);
});

test('theme storage failure leaves the controls usable',async()=>{
  const storage={local:{get:async()=>{throw new Error('offline');},set:async()=>{throw new Error('unavailable');}}};
  const {theme,root,button,attributes,listeners}=fixture(storage);
  theme.init(root,button);await Promise.resolve();listeners.get('click')();await Promise.resolve();
  assert.equal(attributes.get('data-theme'),'dark');
});
