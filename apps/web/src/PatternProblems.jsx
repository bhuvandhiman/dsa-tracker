import { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Link, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { requestJson } from './api.js';
import { historyDate, relativePractice } from './dates.js';
import ArcadeIcon from './ArcadeIcon.jsx';
const AttemptEditor=lazy(()=>import('./AttemptEditor.jsx'));
const colors={easy:'success',medium:'warning',hard:'error'};
const labels={independent:'On my own',hint:'With hints',solution:'Read the solution',unknown:'Assistance unknown'};

function PlacementDialog({problem,onClose,onSaved}) {
  const [choice,setChoice]=useState(problem.placement.unit);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(){setBusy(true);setError('');try{await requestJson(`/problems/${problem.id}/placement`,{method:'PUT',body:{unit:choice}});onSaved();onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <Dialog open fullWidth maxWidth="xs" onClose={busy?undefined:onClose} aria-labelledby="placement-title">
    <DialogTitle id="placement-title">Choose the primary pattern</DialogTitle>
    <DialogContent><Typography variant="body2" color="text.secondary">Browsing placement does not change the approach stored in earlier recordings.</Typography>
      {error&&<Alert severity="error">{error}</Alert>}
      <RadioGroup value={choice} onChange={e=>setChoice(e.target.value)} aria-label={`Primary pattern for ${problem.title}`}>
        {problem.candidates.map(item=><FormControlLabel key={item.unit} value={item.unit} disabled={busy} control={<Radio/>} label={`${item.name}${item.categoryName!==item.name?' · '+item.categoryName:''}${item.source==='curated'?' · Exact match':''}`}/>)}
      </RadioGroup>
    </DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy||!choice} onClick={save}>{busy?'Saving…':'Save'}</Button></DialogActions>
  </Dialog>;
}

function ProblemRow({problem,onSaved,version}) {
  const [editing,setEditing]=useState(false),[attempt,setAttempt]=useState(null),[historyOpen,setHistoryOpen]=useState(false);
  const [history,setHistory]=useState(null),[error,setError]=useState(''),[page,setPage]=useState(0),[retry,setRetry]=useState(0);
  const [difficulty,setDifficulty]=useState(''),[repairing,setRepairing]=useState(false);
  useEffect(()=>{
    if(!historyOpen)return;
    const controller=new AbortController();
    async function load(){
      try{
        let data,attempts=[];
        for(let offset=0;offset<=page*6;offset+=6){data=await requestJson(`/problems/${problem.id}/history?limit=6&offset=${offset}`,{signal:controller.signal});attempts.push(...data.attempts);if(!data.more)break;}
        if(!controller.signal.aborted){setHistory({...data,attempts,version,page,retry});setError('');}
      }catch(e){if(!controller.signal.aborted)setError(e.message);}
    }
    void load();return ()=>controller.abort();
  },[historyOpen,problem.id,version,page,retry]);
  const loading=historyOpen&&!error&&(!history||history.version!==version||history.page!==page||history.retry!==retry);
  async function repair(){setRepairing(true);setError('');try{await requestJson(`/problems/${problem.id}/difficulty`,{method:'PUT',body:{difficulty}});onSaved();}catch(e){setError(e.message);}finally{setRepairing(false);}}
  const dateLabel=problem.lastPracticedAt?relativePractice(problem.lastPracticedAt):problem.historical?'Previous solve · date unavailable':'No dated practice';
  return <Box sx={{borderBottom:1,borderColor:'divider','&:last-child':{borderBottom:0}}}>
    <Box sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr) auto',md:'minmax(0,1fr) 110px 150px 88px'},gap:1.5,alignItems:'center',px:2,py:1.5}}>
      <Link href={problem.url} target="_blank" rel="noreferrer" sx={{fontWeight:650,color:'text.primary',overflowWrap:'anywhere'}}>{problem.title} ↗</Link>
      <Chip label={problem.difficulty||'Difficulty unavailable'} color={colors[problem.difficulty]||'default'} size="small" variant="outlined" sx={{display:{xs:'none',md:'inline-flex'},justifySelf:'start'}}/>
      <Typography variant="caption" color="text.secondary" sx={{display:{xs:'none',md:'block'}}}>{dateLabel}</Typography>
      <Stack direction="row"><IconButton sx={{minWidth:44,minHeight:44}} onClick={()=>setHistoryOpen(v=>!v)} aria-label={`${historyOpen?'Hide':'Show'} solve history for ${problem.title}`} aria-expanded={historyOpen} aria-controls={`history-${problem.id}`}><ArcadeIcon name="history" sx={{fontSize:18}}/></IconButton>
        <IconButton sx={{minWidth:44,minHeight:44}} disabled={!problem.candidates?.length} onClick={()=>setEditing(true)} aria-label={`Edit pattern for ${problem.title}`}><ArcadeIcon name="edit" sx={{fontSize:18}}/></IconButton></Stack>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{display:{xs:'flex',md:'none'},gridColumn:'1/-1'}}><Chip label={problem.difficulty||'Difficulty unavailable'} color={colors[problem.difficulty]||'default'} size="small" variant="outlined"/><Typography variant="caption" color="text.secondary">{dateLabel}</Typography></Stack>
    </Box>
    <Collapse in={historyOpen}><Box id={`history-${problem.id}`} sx={{p:2,bgcolor:'background.default',borderTop:1,borderColor:'divider'}}>
      <Typography component="h3" variant="subtitle2">Solve history · Asia/Calcutta</Typography>
      {error&&<Alert severity="error" action={<Button onClick={()=>{setError('');setRetry(v=>v+1);}}>Retry</Button>}>{error}</Alert>}
      {loading&&<Typography role="status" variant="caption">Loading history…</Typography>}
      {history&&<Stack spacing={1.5} sx={{mt:1.5}}>{history.attempts.map(item=><Box key={item.id} sx={{borderBottom:1,borderColor:'divider',pb:1.5}}>
        <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}>
          <Box><Typography variant="body2">{historyDate(item.attemptedAt)} · {labels[item.assistance]||'Practice recorded'}</Typography>
            <Typography variant="caption" color="text.secondary">{item.imported?'Imported accepted submission':item.captureSource==='accepted'?'Recorded after Accepted':'Manual recording'} · {(history.units||[]).find(unit=>unit.slug===item.practiceUnit)?.name||item.practiceUnit||'Unspecified approach'} · {item.approachSource==='confirmed'?'Confirmed approach':'Inferred approach'}</Typography>
          </Box>{!item.imported&&<Button size="small" onClick={()=>setAttempt(item)} aria-label={`Edit recording from ${historyDate(item.attemptedAt)} for ${problem.title}`}>Edit recording</Button>}
        </Stack>{item.notes&&<Typography variant="body2" sx={{mt:0.75,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.notes}</Typography>}
      </Box>)}
        {history.legacy&&<Typography variant="caption" color="text.secondary">Previous accepted solve · date unavailable · assistance and approach unknown</Typography>}
        {!history.attempts.length&&!history.legacy&&<Typography variant="caption">No solve history recorded.</Typography>}
        {history.more&&<Button disabled={loading} onClick={()=>setPage(v=>v+1)}>Load earlier recordings</Button>}
      </Stack>}
      {!problem.difficulty&&<Stack direction={{xs:'column',sm:'row'}} gap={1.5} sx={{mt:2}}><TextField select size="small" label="Correct missing difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)} disabled={repairing} sx={{minWidth:200}}>{['easy','medium','hard'].map(value=><MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><Button disabled={!difficulty||repairing} onClick={repair}>{repairing?'Saving…':'Save difficulty'}</Button></Stack>}
    </Box></Collapse>
    {editing&&<PlacementDialog problem={problem} onClose={()=>setEditing(false)} onSaved={onSaved}/>}
    {attempt&&<Suspense fallback={<Typography role="status">Loading editor…</Typography>}><AttemptEditor attempt={attempt} patterns={history.units||[]} onClose={()=>setAttempt(null)} onSaved={()=>{setRetry(v=>v+1);onSaved();}}/></Suspense>}
  </Box>;
}

export default function PatternProblems({unit,name,onSaved,version}) {
  const [result,setResult]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [page,setPage]=useState(0),[query,setQuery]=useState('');
  const [filters,setFilters]=useState({status:'all',difficulty:'',dates:'all',sort:'newest'});
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({category:unit,q:query,limit:'10',offset:String(page*10),...filters});
      requestJson(`/pattern-problems?${params}`,{signal:controller.signal}).then(data=>{
        if(controller.signal.aborted)return;
        if(page>0&&page*10>=data.total){setPage(Math.max(0,Math.ceil(data.total/10)-1));return;}
        setResult(data);setError('');
      }).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    },180);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[unit,page,query,filters,retry,version]);
  function changeFilter(key,value){setFilters(current=>({...current,[key]:value}));setPage(0);setResult(null);setError('');}
  const options={status:[['all','All evidence'],['practiced','Dated practice'],['historical','Previous solves'],['unpracticed','No dated practice']],difficulty:[['','All difficulties'],['easy','Easy'],['medium','Medium'],['hard','Hard'],['unknown','Missing difficulty']],dates:[['all','All practice dates'],['dated','Known dates'],['undated','Dates unavailable'],['older30','Over 30 days ago']],sort:[['newest','Recently added'],['title','Problem name'],['oldest-practice','Oldest practice first'],['recent-practice','Latest practice first']]};
  return <Stack spacing={1.5}>
    <Typography component="h2" variant="h6">{name||'Problems'}</Typography>
    <TextField size="small" label="Find a problem" placeholder="Find a problem…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setResult(null);setError('');}} slotProps={{htmlInput:{'aria-label':`Search problems in ${name||unit}`,maxLength:200}}}/>
    <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr',lg:'repeat(4,minmax(0,1fr))'},gap:1.5}}>{Object.entries(options).map(([key,values])=><TextField key={key} select size="small" label={{status:'Evidence',difficulty:'Difficulty',dates:'Last practiced',sort:'Sort by'}[key]} value={filters[key]} onChange={e=>changeFilter(key,e.target.value)}>{values.map(([value,label])=><MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>)}</Box>
    {error&&<Alert severity="error" action={<Button onClick={()=>setRetry(v=>v+1)}>Retry</Button>}>{error}</Alert>}
    {result?<Box sx={{border:1,borderColor:'divider',borderRadius:2,overflow:'hidden'}}>{result.problems.map(problem=><ProblemRow key={problem.id} problem={problem} onSaved={onSaved} version={version}/>)}{!result.total&&<Typography sx={{p:3}}>No problems match these filters.</Typography>}</Box>:<Typography role="status">{error?'Problems unavailable.':'Loading problems…'}</Typography>}
    {result&&(page>0||result.total>10)&&<Stack direction="row" justifyContent="space-between" alignItems="center"><Button disabled={!page} onClick={()=>{setResult(null);setPage(v=>v-1);}}>Previous</Button><Typography variant="caption">{page+1} / {Math.max(1,Math.ceil(result.total/10))}</Typography><Button disabled={(page+1)*10>=result.total} onClick={()=>{setResult(null);setPage(v=>v+1);}}>Next</Button></Stack>}
  </Stack>;
}
