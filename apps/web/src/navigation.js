export function readRoute(hash) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  if (path === 'patterns' || parts[0] === 'patterns') {
    let slug;
    try { slug = parts[1] ? decodeURIComponent(parts[1]) : null; }
    catch { slug = '__invalid__'; }
    return {page:'patterns',slug,query:new URLSearchParams(query).get('q') || ''};
  }
  return {page:'dashboard',slug:null,query:''};
}

export function patternLink(slug, query = '') {
  return `#/patterns${slug ? `/${encodeURIComponent(slug)}` : ''}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
}
