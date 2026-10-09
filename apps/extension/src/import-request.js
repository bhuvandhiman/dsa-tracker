export function requestError(message,{code='REQUEST',status,retryable=false,retryAfter=0}={}){
  return Object.assign(new Error(message),{code,status,retryable,retryAfter});
}

export async function readRecallResponse(response){
  const status=response.status,retryable=[408,429,500,502,503,504].includes(status),header=response.headers?.get('Retry-After'),seconds=Number(header);
  const retryAfter=header?(Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(header)-Date.now())||0):0;
  let data;
  try{data=await response.json();}catch{
    throw requestError(status===401?'Open Recall to reconnect, then resume.':retryable?'Recall is temporarily unavailable. Your saved progress is kept; retry shortly.':'Recall returned an unreadable response. Your saved progress is kept.',{code:status===401?'SESSION':'RESPONSE',status,retryable:response.ok||retryable,retryAfter});
  }
  if(!data||typeof data!=='object'||Array.isArray(data))throw requestError(status===401?'Open Recall to reconnect, then resume.':'Recall returned an incomplete response. Your checkpoint is kept.',{code:status===401?'SESSION':'RESPONSE',status,retryable:response.ok||retryable,retryAfter});
  if(!response.ok){
    throw requestError((typeof data.error==='string'?data.error:'Recall could not complete this request.')+(status===401?' Open Recall to reconnect, then resume.':''),{code:status===401?'SESSION':'HTTP',status,retryable,retryAfter});
  }
  return data;
}

// Only the idempotent import endpoints opt in. Reuse the exact body/run ID.
export async function retryImportRequest(operation,{onRetry=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),check=()=>{}}={}){
  for(let attempt=0;;attempt++){
    check();
    try{return await operation();}catch(error){
      if(!error.retryable||attempt>=2||error.retryAfter>10000)throw error;
      const delay=Math.max(error.retryAfter||0,(attempt+1)*1500);
      onRetry({attempt:attempt+1,delay,error});await wait(delay);check();
    }
  }
}
