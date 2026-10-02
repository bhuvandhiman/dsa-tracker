import { useEffect, useRef, useState } from 'react';
import { connectAuth } from './auth-client.js';
import { request } from './api.js';

export default function useAuth(){
  const [state,setState]=useState({loading:true,config:null,client:null,user:null,setup:null,error:''});
  const generation=useRef(0);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let unsubscribe=()=>{},active=true;
    async function hydrate(session,config,client){
      const current=++generation.current;
      if(!session){if(active)setState({loading:false,config,client,user:null,setup:null,error:''});return;}
      try{
        const account=await request('/session',{signal:controller.signal});
        if(active&&current===generation.current)setState({loading:false,config,client,...account,error:''});
      }catch(error){if(active&&current===generation.current)setState({loading:false,config,client,user:null,setup:null,error:error.message});}
    }
    async function load(){
      try{
        const config=await request('/auth/config',{signal:controller.signal}),client=await connectAuth(config);
        if(!active)return;
        if(!client){setState({loading:false,config,client:null,user:null,setup:null,error:''});return;}
        const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{
          generation.current++;
          // SDK callbacks must finish before another SDK/session operation.
          setTimeout(()=>{if(active)void hydrate(session,config,client);},0);
        });unsubscribe=()=>subscription.unsubscribe();
        const {data,error}=await client.auth.getSession();if(error)throw error;
        await hydrate(data.session,config,client);
      }catch(error){if(active)setState({loading:false,config:null,client:null,user:null,setup:null,error:error.message});}
    }
    void load();return()=>{active=false;generation.current++;controller.abort();unsubscribe();};
  },[reload]);
  return {...state,retry:()=>setReload(value=>value+1),refresh:async()=>{const current=++generation.current,account=await request('/session');if(current===generation.current)setState(value=>({...value,...account,error:''}));return account;},async signOut(){generation.current++;const {error}=await state.client.auth.signOut();if(error)throw error;window.location.hash='/home';}};
}
