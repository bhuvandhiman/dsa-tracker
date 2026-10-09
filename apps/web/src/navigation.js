export function readRoute(hash) {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const account=new URLSearchParams(query).get('account');
  if(parts.length===1&&['signup','login','forgot-password','reset-password','setup','install-extension','privacy','connect','profile','history'].includes(parts[0]))return {page:parts[0],...(parts[0]==='login'&&['deleted','deletion-pending'].includes(account)?{account}:{})};
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
export function readLocation(location){
  const query=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.replace(/^#/,''));
  const route=readRoute(location.hash&&location.hash!=='#main'?location.hash:location.pathname+location.search);
  // Keep the existing email redirect URL compatible with Supabase's allowlist.
  // Its login hash is an auth callback, not an invitation to sign in again.
  const callback=query.get('auth'),hasResult=query.has('code')||fragment.has('access_token')||fragment.has('error')||query.has('error');
  if(callback==='recovery'&&(hasResult||!location.hash||route.page==='reset-password')||fragment.get('type')==='recovery')return {page:'reset-password'};
  if(hasResult||callback==='callback'&&(!location.hash||route.page==='login'))return {page:'auth-callback',error:fragment.get('error_description')||query.get('error_description')||fragment.get('error')||query.get('error')||''};
  return route;
}

export function confirmedLocation(location,destination='/dashboard'){
  const query=new URLSearchParams(location.search);
  for(const name of ['auth','code','sb_flow_id','error','error_code','error_description'])query.delete(name);
  const search=query.toString();
  return `${location.pathname}${search?'?'+search:''}#${destination}`;
}

export function patternLink(slug, query = '') {
  return `#/patterns${slug ? `/${encodeURIComponent(slug)}` : ''}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
}
