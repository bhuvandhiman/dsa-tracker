import { useEffect, useRef, useState } from 'react';
import { connectAuth,initializedSession } from './auth-client.js';
import { abortable,request,setWorkspaceScope } from './api.js';

export default function useAuth(){
  const [state,setState]=useState({loading:true,config:null,client:null,user:null,sessionUser:null,setup:null,error:''});
  const generation=useRef(0);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const epoch=generation;
    const controller=new AbortController();let unsubscribe=()=>{},active=true;
    async function hydrate(session,config,client){
      const current=++generation.current;
      setWorkspaceScope(session?.user?.id||null);
      const sessionUser=session?.user||null;
      if(!session){if(active)setState({loading:false,config,client,user:null,sessionUser:null,setup:null,error:''});return;}
      try{
        const account=await request('/session',{signal:controller.signal});
        if(active&&current===generation.current)setState({loading:false,config,client,...account,sessionUser,error:''});
      }catch(error){if(active&&current===generation.current)setState({loading:false,config,client,user:null,sessionUser,setup:null,error:error.message});}
    }
    async function load(){
      try{
        const config=await request('/auth/config',{signal:controller.signal}),client=await connectAuth(config);
        if(!active)return;
        if(!client){setState({loading:false,config,client:null,user:null,sessionUser:null,setup:null,error:''});return;}
        const session=await initializedSession(client,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]));
        if(!active)return;
        const initialGeneration=generation.current;
        const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{
          if(!active)return;
          const scheduled=++generation.current;
          setWorkspaceScope(session?.user?.id||null);
          setState(value=>value.user?.id===session?.user?.id&&session?{...value,sessionUser:session.user}:{...value,loading:true,user:null,sessionUser:session?.user||null,setup:null,error:''});
          // SDK callbacks must finish before another SDK/session operation.
          setTimeout(()=>{if(active&&scheduled===generation.current)void hydrate(session,config,client);},0);
        });unsubscribe=()=>subscription.unsubscribe();
        if(initialGeneration===generation.current)await hydrate(session,config,client);
      }catch(error){if(active)setState({loading:false,config:null,client:null,user:null,sessionUser:null,setup:null,error:error.message});}
    }
    void load();return()=>{active=false;epoch.current++;controller.abort();unsubscribe();};
  },[reload]);
  return {...state,retry:()=>setReload(value=>value+1),refresh:async()=>{const current=++generation.current,account=await request('/session');if(current===generation.current)setState(value=>({...value,loading:false,...account,error:''}));return account;},async signOut({scope='global',destination='/home'}={}){generation.current++;setWorkspaceScope(null);setState(value=>({...value,loading:true,user:null,sessionUser:null,setup:null,error:''}));try{const {error}=await abortable(state.client.auth.signOut({scope}),AbortSignal.timeout(15000));if(error)throw error;setState(value=>({...value,loading:false,error:''}));window.location.hash=destination;}catch(error){setState(value=>({...value,loading:false,error:error.message}));throw error;}}};
}
