// One palette for extension pages and the isolated recording panel.
globalThis.DsaTheme = {
  styles: `:root,:host{color-scheme:light;--canvas:#fafbe9;--ink:#202720;--muted:#606756;--surface:#f2f3e2;--line:#e0e3cf;--coral:#e96586;--mustard:#f2b632;--teal:#2c8075;--focus:#2c8075;--accent:#9a2948;--soft-coral:#f9e0e5;--success:#235d50}
    :root[data-theme=dark],:host([data-theme=dark]){color-scheme:dark;--canvas:#181f1c;--ink:#f3f2df;--muted:#b9c2b5;--surface:#232d26;--line:#3b483c;--focus:#82cabb;--accent:#f5aec2;--soft-coral:#402d34;--success:#82cabb}
    .theme-toggle{display:grid;place-items:center;flex-shrink:0;width:44px;min-width:44px;height:44px;padding:10px;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--ink);cursor:pointer}
    .theme-toggle svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .theme-toggle:hover:not(:disabled){background:var(--soft-coral);transform:none}
    .theme-toggle:focus-visible{outline:3px solid var(--focus);outline-offset:3px}`,
  init(root, button) {
    const storage = globalThis.chrome?.storage;
    let changed = false, disposed = false;
    function apply(value) {
      const theme = value === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-theme',theme);
      if (!button) return;
      const action = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      button.setAttribute('aria-label',action);button.title=action;
      const svg = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
      const path = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',theme === 'dark' ? 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5' : 'M20.4 14.4A9 9 0 0 1 9.6 3.6a9 9 0 1 0 10.8 10.8Z');
      svg.append(path);button.replaceChildren(svg);
    }
    apply('light');
    storage?.local?.get('recallTheme').then(value=>{if(!disposed&&!changed)apply(value.recallTheme);}).catch(()=>{});
    function toggle() {
      changed=true;const theme=root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';apply(theme);
      storage?.local?.set({recallTheme:theme}).catch(()=>{});
    }
    function sync(changes,area) {if(area==='local' && changes.recallTheme){changed=true;apply(changes.recallTheme.newValue);}}
    button?.addEventListener('click',toggle);storage?.onChanged?.addListener(sync);
    return ()=>{disposed=true;button?.removeEventListener('click',toggle);storage?.onChanged?.removeListener(sync);};
  },
};
