const key='recall-return-to';
export function safeDestination(value){
  return typeof value==='string'&&value.length<=1000&&/^\/(dashboard|patterns(?:\/[a-z0-9-]+)?|settings|connect|profile|history)(?:\?[^#\r\n]*)?$/.test(value)?value:null;
}
export function rememberDestination(value,storage=sessionStorage){try{const safe=safeDestination(value);if(safe)storage.setItem(key,safe);}catch{/* Navigation still works without storage. */}}
export function needsGoalSetup(setup){return setup?.goal?.configured!==true;}
export function needsWorkspaceSetup(setup){return setup?.profileConfigured===false||needsGoalSetup(setup);}
export function accountDestination(setup,storage=sessionStorage){
  if(needsWorkspaceSetup(setup))return '/setup';
  try{const value=safeDestination(storage.getItem(key));storage.removeItem(key);return value||'/dashboard';}catch{return '/dashboard';}
}
