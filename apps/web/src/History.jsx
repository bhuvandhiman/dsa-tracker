import {useEffect,useRef,useState} from 'react';
import {useWorkspaceRequest} from './workspace-context.js';
import {safeProblemUrl} from './workflow-model.js';

const pageSize=25;
const dateFormat=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Calcutta'});

export default function History({visible}){
  const request=useWorkspaceRequest();
  const heading=useRef(null);
  const [offset,setOffset]=useState(0),[revision,setRevision]=useState(0);
  const [state,setState]=useState({offset:0,data:null,error:''});
  useEffect(()=>{
    if(!visible)return;
    const controller=new AbortController();
    let pending=false;
    async function refresh(){
      if(pending||document.visibilityState==='hidden')return;
      pending=true;
      try{
        const data=await request(`/history?limit=${pageSize}&offset=${offset}`,{signal:controller.signal});
        if(!Array.isArray(data.problems)||typeof data.more!=='boolean')throw new Error('Could not read your history. Please try again.');
        if(!controller.signal.aborted){
          if(offset>0&&!data.problems.length)setOffset(value=>Math.max(0,value-pageSize));
          else setState({offset,data,error:''});
        }
      }catch(error){if(!controller.signal.aborted)setState(value=>({offset,data:value.offset===offset?value.data:null,error:error.message}));}
      finally{pending=false;}
    }
    refresh();
    const timer=setInterval(refresh,15000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return ()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[request,visible,offset,revision]);
  const data=state.offset===offset?state.data:null,error=state.offset===offset?state.error:'';
  function changePage(next){
    setOffset(next);
    heading.current?.focus({preventScroll:true});
    heading.current?.scrollIntoView({block:'start'});
  }
  return <section className="workflow-page history-page" hidden={!visible}>
    <p className="eyebrow">Your recent solves</p><h1 ref={heading} tabIndex={-1}>History.</h1><p className="page-description">Your solved problems, newest first.</p>
    {error&&<div className="dashboard-message error-message" role="alert"><p>{error}</p><button type="button" className="secondary-button" onClick={()=>setRevision(value=>value+1)}>Try again</button></div>}
    {!data&&!error&&visible&&<p className="dashboard-message" role="status">Loading your recent solves…</p>}
    {data&&!data.problems.length&&<div className="dashboard-message"><h2>No recent solves yet.</h2><p>New recorded solves and imports with solve dates will appear here. Imported problems with unknown dates stay in Patterns.</p><a className="inline-link" href="#/connect">Connect LeetCode →</a></div>}
    {data?.problems.length>0&&<>
      <ol className="solve-history" start={offset+1} aria-label="Solved problems, newest first">{data.problems.map(problem=><li className="solve-history-row" key={problem.id}>
        {safeProblemUrl(problem.url)?<a className="history-problem-link" href={safeProblemUrl(problem.url)} target="_blank" rel="noopener noreferrer">{problem.title}<span aria-hidden="true"> ↗</span></a>:<strong className="history-problem-link">{problem.title}</strong>}
        <span className={`problem-difficulty difficulty-${problem.difficulty||'unknown'}`}>{problem.difficulty?problem.difficulty[0].toUpperCase()+problem.difficulty.slice(1):'Difficulty unknown'}</span>
        <time dateTime={problem.solvedAt}>{dateFormat.format(new Date(problem.solvedAt))}</time>
      </li>)}</ol>
      {(offset>0||data.more)&&<nav className="pagination" aria-label="History pages"><button type="button" className="secondary-button" disabled={offset===0} onClick={()=>changePage(Math.max(0,offset-pageSize))}>Previous</button><span>{offset+1}–{offset+data.problems.length}</span><button type="button" className="secondary-button" disabled={!data.more} onClick={()=>changePage(offset+pageSize)}>Next</button></nav>}
    </>}
  </section>;
}
