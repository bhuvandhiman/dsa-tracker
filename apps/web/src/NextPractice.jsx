import { useEffect, useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import { safeProblemUrl, subpatternQuery } from './workflow-model.js';
import { patternLink } from './navigation.js';
import { prioritizedPatterns } from './dashboard-model.js';

export default function NextPractice({category}){
  const request=useWorkspaceRequest(),unit=prioritizedPatterns(category.children)[0];
  const [state,setState]=useState({slug:null,problem:null,error:''});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!unit)return;
    const controller=new AbortController();
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)return;
      setState(value=>({slug:unit.slug,problem:value.slug===unit.slug?value.problem:null,error:'',loading:true}));
      return request('/pattern-problems?'+subpatternQuery(unit.slug,{field:'practiced',direction:'asc'},0),{signal:controller.signal});
    }).then(data=>{
      if(controller.signal.aborted)return;
      if(!Array.isArray(data.problems))throw new Error('Could not read your next practice. Please try again.');
      setState({slug:unit.slug,problem:data.problems.find(problem=>safeProblemUrl(problem.url))||null,error:'',loading:false});
    }).catch(error=>{if(!controller.signal.aborted)setState({slug:unit.slug,problem:null,error:error.message,loading:false});});
    return()=>controller.abort();
  },[unit,request,revision]);
  if(!unit)return null;
  const loaded=state.slug===unit.slug,problem=loaded?state.problem:null,loading=!loaded||state.loading,error=loaded?state.error:'';
  return <section className="connection-banner next-practice" aria-busy={loading}><div><p className="eyebrow">Your next practice</p><h2>{category.name} · {unit.name}</h2>{error?<p className="account-error" role="alert">Could not load your next practice. {error}</p>:loading?<p role="status">{problem?'Updating your next practice…':'Finding your next practice…'}</p>:<p>{problem?'A review from your saved problems, ordered by last practice.':'No saved problems here yet. Find a problem in this topic and record it after solving.'}</p>}</div><div className="row-actions">{error?<button type="button" className="secondary-button" onClick={()=>{setState(value=>({...value,error:'',loading:true}));setRevision(value=>value+1);}}>Try again</button>:problem?<a className="primary-button" href={safeProblemUrl(problem.url)} target="_blank" rel="noopener noreferrer">Review {problem.title} ↗</a>:!loading?<a className="primary-button" href="https://leetcode.com/problemset/" target="_blank" rel="noopener noreferrer">Find problems on LeetCode ↗</a>:null}<a className="inline-link" href={patternLink(category.slug)}>Open pattern →</a></div></section>;
}
