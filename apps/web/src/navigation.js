export function readRoute(hash) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const account=new URLSearchParams(query).get('account');
  if(parts.length===1&&['signup','login','forgot-password','reset-password','setup','install-extension','privacy'].includes(parts[0]))return {page:parts[0],...(parts[0]==='login'&&['deleted','deletion-pending'].includes(account)?{account}:{})};
  if (!parts.length || (parts.length === 1 && ['home','about'].includes(parts[0]))) {
    return {page:parts[0] || 'home',section:new URLSearchParams(query).get('section') || ''};
  }
  if (parts[0] === 'settings') {
    return {page:parts[0],id:parts[1] || null,params:new URLSearchParams(query)};
  }
  if (path === 'patterns' || parts[0] === 'patterns') {
    let slug;
    try { slug = parts[1] ? decodeURIComponent(parts[1]) : null; }
    catch { slug = '__invalid__'; }
    return {page:'patterns',slug,query:new URLSearchParams(query).get('q') || ''};
  }
  return {page:'dashboard',slug:null,query:''};
}
export function readLocation(location){return readRoute(location.hash&&location.hash!=='#main'?location.hash:location.pathname+location.search);}

export function patternLink(slug, query = '') {
  return `#/patterns${slug ? `/${encodeURIComponent(slug)}` : ''}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
}
