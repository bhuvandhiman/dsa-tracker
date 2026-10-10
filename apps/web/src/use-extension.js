import { useCallback, useEffect, useRef, useState } from 'react';
import { connectWebsiteExtension } from './extension-bridge.js';
import { practiceCache } from './practice-cache.js';

export default function useExtension(auth){
  const scope=auth.user?.id||(auth.config?.mode==='local'?'local':null);
  const [snapshot,setSnapshot]=useState(null),bridge=useRef(null);
  useEffect(()=>{
    if(!auth.config)return;
    const stop=connectWebsiteExtension(auth.client,window,value=>setSnapshot(previous=>({scope,value:{...(previous?.scope===scope?previous.value:{}),...value}})),()=>practiceCache.changed());
    bridge.current=stop;
    return()=>{bridge.current=null;stop();};
  },[auth.client,auth.config,scope]);
  const request=useCallback(async action=>{
    if(!bridge.current)throw new Error('Checking your Recall session. Please try again.');
    return bridge.current.request(action);
  },[]);
  return {state:snapshot?.scope===scope?snapshot.value:{detected:false,connected:false},request};
}
