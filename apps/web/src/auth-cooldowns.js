const emailActions=new Set(['signup','forgot-password','resend']);

export function createAuthCooldowns(now=Date.now){
  const deadlines=new Map();
  function remaining(action){
    const deadline=Math.max(deadlines.get(action)||0,emailActions.has(action)?deadlines.get('email')||0:0);
    return Math.max(0,Math.ceil((deadline-now())/1000));
  }
  return {
    remaining,
    block(action,seconds,{email=false}={}){
      const deadline=now()+seconds*1000;
      for(const key of email?[action,'email']:[action])deadlines.set(key,Math.max(deadlines.get(key)||0,deadline));
    },
    read(page){return {submit:remaining(page),resend:remaining('resend')};},
  };
}

// Only action deadlines live here; form navigation does not reset them.
export const authCooldowns=createAuthCooldowns();
