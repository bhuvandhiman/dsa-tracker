export function deploymentSettings(env=process.env){
  const mode=env.DEPLOYMENT_MODE||'local';
  if(!['local','hosted'].includes(mode))throw new Error('DEPLOYMENT_MODE must be local or hosted.');
  if(mode==='local')return {mode,origin:null};
  let origin;try{origin=new URL(env.APP_ORIGIN||env.RENDER_EXTERNAL_URL);}catch{throw new Error('Hosted Recall requires APP_ORIGIN or RENDER_EXTERNAL_URL.');}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('APP_ORIGIN must be an HTTPS website origin.');
  if(env.AUTH_MODE!=='supabase'||!env.DATABASE_URL)throw new Error('Hosted Recall requires Supabase authentication and DATABASE_URL.');
  return {mode,origin:origin.origin};
}
