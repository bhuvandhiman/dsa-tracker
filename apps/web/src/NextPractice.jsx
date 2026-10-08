import { useEffect, useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import { safeProblemUrl, subpatternQuery } from './workflow-model.js';
import { patternLink } from './navigation.js';
import { prioritizedPatterns } from './dashboard-model.js';

export default function NextPractice({category}){
  const request=useWorkspaceRequest(),unit=prioritizedPatterns(category.children)[0];
  const [state,setState]=useState({slug:null,problem:null,error:''});
  useEffect(()=>{
    if(!unit)return;
    const controller=new AbortController();
    request('/pattern-problems?'+subpatternQuery(unit.slug,{field:'practiced',direction:'asc'},0),{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({slug:unit.slug,problem:data.problems.find(problem=>safeProblemUrl(problem.url))||null,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({slug:unit.slug,problem:null,error:error.message});});
    return()=>controller.abort();
  },[unit,request]);
  if(!unit)return null;
  const loaded=state.slug===unit.slug,problem=loaded?state.problem:null;
  return <section className="connection-banner next-practice"><div><p className="eyebrow">Your next practice</p><h2>{category.name} · {unit.name}</h2><p>{problem?'A review from your saved problems, ordered by last practice.':loaded&&!state.error?'No saved problems here yet. Find a problem in this topic and record it after solving.':'Open this pattern to choose your next problem.'}</p></div><div className="row-actions">{problem?<a className="primary-button" href={safeProblemUrl(problem.url)} target="_blank" rel="noopener noreferrer">Review {problem.title} ↗</a>:loaded&&!state.error?<a className="primary-button" href="https://leetcode.com/problemset/" target="_blank" rel="noopener noreferrer">Find problems on LeetCode ↗</a>:null}<a className="inline-link" href={patternLink(category.slug)}>Open pattern →</a></div></section>;
}
