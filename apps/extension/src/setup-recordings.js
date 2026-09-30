const list=document.querySelector('#recordings'), refresh=document.querySelector('#refresh-recordings');
async function render(){
  refresh.disabled=true;
  try{
    const result=await chrome.runtime.sendMessage({type:'LIST_RECORDINGS'});
    if(result.error)throw new Error(result.error);
    list.replaceChildren();
    for(const record of result.records){
      const row=document.createElement('p'), link=document.createElement('a');
      const url=new URL(record.url);
      if(url.origin!=='https://leetcode.com'||!url.pathname.startsWith('/problems/'))continue;
      link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=`${record.kind}: ${url.pathname.split('/')[2]}${Array.isArray(record.value)?' · '+record.value.length+' submissions':''}`;
      row.append(link);
      if(record.kind==='conflict'){
        const download=document.createElement('a');download.textContent=' · Download retained choices';download.download='recall-conflict.json';download.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(record.value,null,2));row.append(download);
      }
      list.append(row);
    }
    if(!list.childElementCount)list.textContent='No unfinished recordings.';
  }catch(error){list.textContent=error.message;}finally{refresh.disabled=false;}
}
refresh.addEventListener('click',render);void render();
