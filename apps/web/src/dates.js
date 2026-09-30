export const WORKSPACE_TIME_ZONE = 'Asia/Calcutta';
export function dayString(value, timeZone = WORKSPACE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en', { timeZone,year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date(value));
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function relativePractice(value, asOf = Date.now(), timeZone = WORKSPACE_TIME_ZONE) {
  if(!value)return 'Previous solve · date unavailable';
  const days=Math.max(0,Math.round((Date.parse(dayString(asOf,timeZone))-Date.parse(dayString(value,timeZone)))/86400000));
  return days===0?'Today':days===1?'Yesterday':`${days} days ago`;
}
export function historyDate(value, timeZone = WORKSPACE_TIME_ZONE) {
  return value ? new Intl.DateTimeFormat(undefined,{timeZone,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : 'Date unavailable';
}
export function workspaceTime(value) {
  const parts=new Intl.DateTimeFormat('en',{timeZone:WORKSPACE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
export function workspaceTimeToISO(value) {
  // Kolkata has no DST; this matches the fixed workspace policy used by PostgreSQL.
  const date=new Date(`${value}+05:30`);
  if(!Number.isFinite(date.getTime()) || workspaceTime(date).slice(0,19)!==value.slice(0,19))throw new Error('Choose a valid workspace practice time.');
  return date.toISOString();
}
