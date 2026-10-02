let workspaceScope=null;
export async function connection(){const result=await chrome.runtime.sendMessage({type:'RECALL_ACCOUNT_STATUS'});if(result.error)throw new Error(result.error);if(workspaceScope===null&&result.scope)workspaceScope=result.scope;return result;}
async function send(message){const result=await chrome.runtime.sendMessage({...message,workspaceScope});if(result.error)throw new Error(result.error);return result;}
export async function api(path,body){return (await send({type:'RECALL_API',path,method:body?'POST':'GET',body})).data;}
export const scopedStorage={async get(names){return (await send({type:'RECALL_STATE_GET',names:Array.isArray(names)?names:[names]})).data;},async set(values){await send({type:'RECALL_STATE_SET',values});},async remove(names){await send({type:'RECALL_STATE_REMOVE',names:Array.isArray(names)?names:[names]});}};
