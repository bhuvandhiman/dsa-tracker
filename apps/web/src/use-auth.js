import { useEffect, useRef, useState } from 'react';
import { connectAuth,initializedSession } from './auth-client.js';
import { abortable,requestStartup,setWorkspaceScope } from './api.js';
import {createSessionLoader} from './session-loader.js';

export default function useAuth(){
  const [state,setState]=useState({loading:true,config:null,client:null,user:null,sessionUser:null,setup:null,error:''});
  const generation=useRef(0);
  const verifiedOwner=useRef(null);
  const [readAccount]=useState(()=>createSessionLoader((scope,signal)=>requestStartup('/session',{signal,workspaceScope:scope})));
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const epoch=generation;
    const controller=new AbortController();let unsubscribe=()=>{},active=true;
    async function hydrate(session,config,client){
      const current=++generation.current;
      setWorkspaceScope(session?.user?.id||null);
      const sessionUser=session?.user||null;
      if(!session){verifiedOwner.current=null;if(active)setState({loading:false,config,client,user:null,sessionUser:null,setup:null,error:''});return;}
      try{
        const account=await readAccount(sessionUser.id,controller.signal);
        if(active&&current===generation.current){verifiedOwner.current=account.user?.id;setState({loading:false,config,client,...account,sessionUser,error:''});}
      }catch(error){if(active&&current===generation.current){verifiedOwner.current=null;setState({loading:false,config,client,user:null,sessionUser,setup:null,error:error.message});}}
    }
    async function load(){
      try{
        const config=await requestStartup('/auth/config',{signal:controller.signal}),client=await connectAuth(config);
        if(!active)return;
        if(!client){setState({loading:false,config,client:null,user:null,sessionUser:null,setup:null,error:''});return;}
        const session=await initializedSession(client,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]));
        if(!active)return;
        const initialGeneration=generation.current,initialOwner=session?.user?.id;
        const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
          if(!active)return;
          // initialize/getSession already supplied the initial session. A token
          // renewal or tab focus must not rebuild a verified user's workspace.
          if(event==='INITIAL_SESSION'&&session?.user?.id===initialOwner)return;
          if(session?.user?.id===verifiedOwner.current&&['TOKEN_REFRESHED','SIGNED_IN'].includes(event))return;
          verifiedOwner.current=null;
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
  },[reload,readAccount]);
  return {...state,retry:()=>setReload(value=>value+1),refresh:async()=>{
    const current=++generation.current;
    try{
      const {data,error}=await abortable(state.client.auth.getSession(),AbortSignal.timeout(15000));if(error)throw error;
      const sessionUser=data.session?.user;if(!sessionUser)throw new Error('Please sign in again.');
      const account=await readAccount(sessionUser.id);
      if(current===generation.current){verifiedOwner.current=account.user?.id;setState(value=>({...value,loading:false,...account,sessionUser,error:''}));}
      return account;
    }catch(error){if(current===generation.current){verifiedOwner.current=null;setState(value=>({...value,loading:false,user:null,setup:null,error:error.message}));}throw error;}
  },async signOut({scope='global',destination='/home'}={}){generation.current++;verifiedOwner.current=null;setWorkspaceScope(null);setState(value=>({...value,loading:true,user:null,sessionUser:null,setup:null,error:''}));try{const {error}=await abortable(state.client.auth.signOut({scope}),AbortSignal.timeout(15000));if(error)throw error;setState(value=>({...value,loading:false,error:''}));window.location.hash=destination;}catch(error){setState(value=>({...value,loading:false,error:error.message}));throw error;}}};
}
