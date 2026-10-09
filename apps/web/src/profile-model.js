export function accountInitials(user){
  const label=user?.name?.trim()||user?.email?.split('@')[0]||'Recall';
  return label.split(/[\s._-]+/).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0]).join('').toLocaleUpperCase();
}
