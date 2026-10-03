import { useEffect, useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import PatternMenu from './PatternMenu.jsx';
import { NextAction } from './PatternMetrics.jsx';
import { nextProblemSort, safeProblemUrl, subpatternQuery, validPageOffset, undatedPracticeLabel } from './workflow-model.js';

function ProblemLink({problem}) {
  const url = safeProblemUrl(problem.url);
  return url ? <a className="problem-title-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${problem.title} on LeetCode (opens in a new tab)`}>{problem.title}</a> : problem.title;
}

function ProblemList({slug,onChanged}) {
  const request=useWorkspaceRequest();
  const [sort,setSort] = useState({field:null,direction:null});
  const [offset,setOffset] = useState(0);
  const [revision,setRevision] = useState(0);
  const [state,setState] = useState({query:null,data:null,error:''});
  const query = subpatternQuery(slug,sort,offset);
  useEffect(()=>{
    const controller = new AbortController();
    request(`/pattern-problems?${query}`,{signal:controller.signal}).then(data=>{
      if(controller.signal.aborted)return;
      const validOffset=validPageOffset(offset,data.total);
      if(validOffset!==offset){setOffset(validOffset);return;}
      setState({query,data,error:''});
    }).catch(error=>{
      if (!controller.signal.aborted) setState({query,data:null,error:error.message});
    });
    return ()=>controller.abort();
  },[query,revision,offset,request]);
  const current = state.query === query ? state : {data:null,error:''};
  function reorder(field) {setSort(value=>nextProblemSort(value,field));setOffset(0);}
  function heading(field,label) {
    const direction = sort.field === field ? sort.direction : null;
    const next = !direction ? 'ascending' : direction === 'asc' ? 'descending' : 'normal';
    return <th className={`problem-${field}-column`} scope="col" aria-sort={!direction ? 'none' : direction === 'asc' ? 'ascending' : 'descending'}><button className="column-sort" aria-label={`${label}: ${!direction ? 'normal' : direction === 'asc' ? 'ascending' : 'descending'}. Sort ${next}`} onClick={()=>reorder(field)}>{label}<span aria-hidden="true">{direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}</span></button></th>;
  }
  return <div className="inline-problems">
    <table className="problem-table" aria-label="Subpattern problems"><thead><tr><th className="problem-name-column" scope="col">Problem</th>{heading('difficulty','Difficulty')}{heading('practiced','Last practiced')}<th className="problem-options-column" scope="col"><span className="visually-hidden">Options</span></th></tr></thead><tbody>{current.data?.problems.map(problem=><tr key={problem.id}><td className="problem-name-column"><ProblemLink problem={problem} /></td><td className={`problem-difficulty-column problem-difficulty difficulty-${problem.difficulty || 'unknown'}`}>{problem.difficulty || 'Unknown'}</td><td className="problem-practiced-column">{problem.lastPracticedAt ? new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Calcutta'}).format(new Date(problem.lastPracticedAt)) : <span className="undated-label">{undatedPracticeLabel(problem)}</span>}</td><td className="problem-options-column"><PatternMenu problem={problem} onSaved={()=>{setRevision(value=>value+1);onChanged();}} /></td></tr>)}</tbody></table>
    {current.error ? <div role="alert"><p>{current.error}</p><button className="secondary-button" onClick={()=>setRevision(value=>value+1)}>Try again</button></div> : !current.data ? <p role="status">Loading problems…</p> : <>
      {!current.data.problems.length && <p>No problems here yet. Import your accepted problems or record practice through the extension.</p>}
      {(current.data.total > 25 || offset > 0) && <div className="pagination"><button className="secondary-button" disabled={!offset} onClick={()=>setOffset(value=>Math.max(0,value-25))}>← Previous</button><span>{current.data.problems.length ? `${offset+1}–${offset+current.data.problems.length}` : 'No records'}</span><button className="secondary-button" disabled={offset+25 >= current.data.total} onClick={()=>setOffset(value=>value+25)}>Next →</button></div>}
    </>}
  </div>;
}

export default function SubpatternProblems({slug,name,children,onChanged,next = false}) {
  const [open,setOpen] = useState(false);
  return <details className={`subpattern-row ${next ? 'is-next' : ''}`} onToggle={event=>setOpen(event.currentTarget.open)}><summary className="subpattern-header" aria-label={`${name} problems${next ? '. Next recommended subpattern' : ''}`}>{children}<NextAction next={next} expanded={open} disclosure /></summary>{open && <ProblemList slug={slug} onChanged={onChanged} />}</details>;
}
