import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { requestJson } from './api.js';
import { historyDate } from './dates.js';
export default function WorkspaceSettings({onClose,onChanged}) {
  const [ready,setReady]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [backup,setBackup]=useState(null),[removed,setRemoved]=useState([]),[page,setPage]=useState(0),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([requestJson('/ready',{signal:controller.signal}),requestJson(`/attempts/removed?limit=10&offset=${page*10}`,{signal:controller.signal})]).then(([info,data])=>{if(!controller.signal.aborted){setReady(info);setRemoved(data.attempts);setError('');}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return ()=>controller.abort();
  },[page,retry]);
  async function run(action){setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function download(){await run(async()=>{
    const data=await requestJson('/workspace/backup');
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`recall-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Backup downloaded. Keep it somewhere safe.');
  });}
  async function choose(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;setBackup(null);setError('');try{if(file.size>20*1024*1024)throw new Error('Backup must be no larger than 20 MB.');const data=JSON.parse(await file.text());if(data.format!=='recall-backup'||data.version!==1||!data.tables)throw new Error('Choose a Recall backup JSON file.');setBackup(data);}catch(e){setError(e.message);}}
  return <Dialog open fullWidth maxWidth="md" onClose={busy?undefined:onClose} aria-labelledby="workspace-title"><DialogTitle id="workspace-title">Workspace settings</DialogTitle><DialogContent>
    <Stack spacing={3}>
      {error&&<Alert severity="error" action={<Button onClick={()=>setRetry(v=>v+1)}>Retry</Button>}>{error}</Alert>}{notice&&<Alert severity="success">{notice}</Alert>}
      <Box><Typography component="h2" variant="h6">Connection and account</Typography><Typography variant="body2">{ready?`Database connected · ${ready.storage} · ${ready.timeZone}`:'Checking local API and database…'}</Typography><Typography variant="body2">LeetCode account: {ready?.account||'Not bound yet; the first verified recording or import binds this workspace.'}</Typography></Box>
      <Box><Typography component="h2" variant="h6">Backup and restore</Typography><Typography variant="body2" color="text.secondary">Backups include recordings, notes, removed recordings, imports, placement choices and your goal. They contain no LeetCode cookies or database credentials. Restore adds missing records and refuses conflicting existing records; it never overwrites newer practice. Use an empty workspace for a complete recovery.</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{mt:1.5}}><Button variant="outlined" disabled={busy} onClick={download}>Download backup</Button><Button component="label" disabled={busy}>Choose backup<input hidden type="file" accept="application/json,.json" onChange={choose}/></Button></Stack>
        {backup&&<Alert severity="info" sx={{mt:2}}>Backup from {historyDate(backup.exportedAt)} · {Object.values(backup.tables).reduce((sum,rows)=>sum+(Array.isArray(rows)?rows.length:0),0)} records.<Stack direction="row" gap={1}><Button disabled={busy} onClick={()=>run(async()=>{const result=await requestJson('/workspace/restore',{body:backup,timeout:60000});setBackup(null);setNotice(`Restored ${result.records} records.`);setRetry(v=>v+1);onChanged();})}>Restore these records</Button><Button disabled={busy} onClick={()=>setBackup(null)}>Cancel</Button></Stack></Alert>}
      </Box>
      <Box><Typography component="h2" variant="h6">Removed recordings</Typography><Typography variant="body2" color="text.secondary">Restore mistakes without creating another recording.</Typography><Stack spacing={1} sx={{mt:1.5}}>{removed.map(item=><Stack key={item.id} direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}><Typography variant="body2">{item.problem.title} · {historyDate(item.attemptedAt)}</Typography><Button disabled={busy} onClick={()=>run(async()=>{await requestJson(`/attempts/${item.id}/restore`,{body:{revision:item.revision}});setRetry(v=>v+1);onChanged();setNotice('Recording restored.');})}>Restore recording</Button></Stack>)}{!removed.length&&<Typography variant="body2">No removed recordings on this page.</Typography>}<Stack direction="row" justifyContent="space-between"><Button disabled={busy||!page} onClick={()=>setPage(v=>v-1)}>Previous</Button><Button disabled={busy||removed.length<10} onClick={()=>setPage(v=>v+1)}>Next</Button></Stack></Stack></Box>
    </Stack>
  </DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Close</Button></DialogActions></Dialog>;
}
