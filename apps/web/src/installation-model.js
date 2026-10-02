export function installationLink(value,{store=false}={}){
  if(typeof value!=='string'||!value||value.startsWith('//')||!(value.startsWith('/')||value.startsWith('https://')))return null;
  try{
    const url=new URL(value,'https://recall.invalid');
    if(url.username||url.password||url.protocol!=='https:')return null;
    if(store&&url.hostname!=='chromewebstore.google.com')return null;
    return url.origin==='https://recall.invalid'&&value.startsWith('/')&&!value.startsWith('//')?value:url.href;
  }catch{return null;}
}
