export function normalizeProfileName(value){
  return typeof value==='string'?value.trim().replace(/\s+/gu,' '):'';
}

export function profileNameError(value){
  if(typeof value!=='string'||!normalizeProfileName(value))return 'Enter the name you would like to use in Recall.';
  if(!value.isWellFormed()||/\p{Cc}/u.test(value))return 'Use a name without control characters or line breaks.';
  if(normalizeProfileName(value).length>100)return 'Keep your name to 100 characters or fewer.';
  return '';
}

export function hasProfileName(value){return !profileNameError(value);}
