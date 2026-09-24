// Signed-in reads stay on leetcode.com. Session cookies never leave the browser.
globalThis.DsaLegacy = {
  async json(path, options = {}) {
    const response = await fetch('https://leetcode.com'+path, {credentials:'include',redirect:'error',signal:AbortSignal.timeout(20000),...options});
    if(!response.ok) throw new Error(response.status===429?'LeetCode is rate limiting requests. Wait a little, then resume.':'Could not read LeetCode. Check that you are signed in and the page loads normally.');
    try {return await response.json();} catch {throw new Error('LeetCode returned an unexpected page. Open LeetCode normally, then resume.');}
  },
  async graphql(query,variables={}) {
    const csrf=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('csrftoken='))?.slice(10);
    const result=await this.json('/graphql/',{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'x-csrftoken':decodeURIComponent(csrf)}:{})},body:JSON.stringify({query,variables})});
    if(result.errors?.length||!result.data) throw new Error('LeetCode could not provide the requested problem data. Resume later.');
    return result.data;
  },
  async scan() {
    const before=await this.graphql('query { userStatus { isSignedIn username } }');
    const username=before.userStatus?.username;
    if(!before.userStatus?.isSignedIn||typeof username!=='string'||!username) throw new Error('Sign in to LeetCode in this Chrome profile first.');
    const result=await this.json('/api/problems/all/');
    const after=await this.graphql('query { userStatus { isSignedIn username } }');
    if(!after.userStatus?.isSignedIn||after.userStatus.username!==username||result.user_name!==username) throw new Error('LeetCode account changed or could not be verified. Resume with the same account.');
    if(!Array.isArray(result.stat_status_pairs)) throw new Error('LeetCode changed its solved-problem response. Nothing was imported.');
    const problems=new Map();
    for(const row of result.stat_status_pairs) {
      if(row.status!=='ac') continue;
      const slug=row.stat?.question__title_slug;
      if(typeof slug!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('LeetCode returned an invalid solved problem.');
      problems.set(slug,{slug});
    }
    if(!Number.isInteger(result.num_solved)||result.num_solved!==problems.size) throw new Error('LeetCode returned an incomplete solved list. Resume later; no partial scan was accepted.');
    return {username,problems:[...problems.values()].sort((a,b)=>a.slug.localeCompare(b.slug))};
  },
  async recent() {
    const before=await this.graphql('query { userStatus { isSignedIn username } }');
    const username=before.userStatus?.username;
    if(!before.userStatus?.isSignedIn||typeof username!=='string'||!username)throw new Error('Sign in to LeetCode first.');
    const data=await this.graphql('query($username:String!){userStatus{isSignedIn username} recentAcSubmissionList(username:$username,limit:20){id title titleSlug timestamp}}',{username});
    if(!data.userStatus?.isSignedIn||data.userStatus.username!==username)throw new Error('LeetCode account changed. Retry with the original account.');
    if(!Array.isArray(data.recentAcSubmissionList)||data.recentAcSubmissionList.length>20)throw new Error('Recent dates are unavailable. Your undated imports remain intact.');
    const submissions=new Map();
    for(const row of data.recentAcSubmissionList) {
      const id=String(row.id),seconds=Number(row.timestamp),time=seconds*1000;
      if(!/^\d{1,30}$/.test(id)||typeof row.titleSlug!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.titleSlug)||!Number.isFinite(time)||time<946684800000||time>Date.now()+60000||typeof row.title!=='string')throw new Error('LeetCode returned invalid recent practice data. Nothing was initialized.');
      const submission={submissionId:id,slug:row.titleSlug,submittedAt:new Date(time).toISOString()};
      const old=submissions.get(id);
      if(old&&JSON.stringify(old)!==JSON.stringify(submission))throw new Error('Conflicting recent submission data.');
      submissions.set(id,submission);
    }
    return {username,submissions:[...submissions.values()]};
  },
  async topics(slugs,username) {
    if(!Array.isArray(slugs)||!slugs.length||slugs.length>10||slugs.some(s=>typeof s!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))) throw new Error('Invalid topic request.');
    const declarations=slugs.map((_,i)=>`$s${i}:String!`).join(',');
    const fields=slugs.map((_,i)=>`q${i}:question(titleSlug:$s${i}) { title titleSlug difficulty topicTags { name } }`).join('\n');
    const data=await this.graphql(`query(${declarations}) {userStatus{isSignedIn username} ${fields}}`,Object.fromEntries(slugs.map((s,i)=>['s'+i,s])));
    if(!data.userStatus?.isSignedIn||data.userStatus.username!==username) throw new Error('Sign back into '+username+' on LeetCode to resume this import.');
    return slugs.map((slug,i)=>{
      const q=data['q'+i];
      if(!q||q.titleSlug!==slug||typeof q.title!=='string'||!Array.isArray(q.topicTags)||q.topicTags.some(t=>typeof t.name!=='string')||!['Easy','Medium','Hard'].includes(q.difficulty)) throw new Error('Could not read all problem topics. Resume to retry this batch.');
      return {url:`https://leetcode.com/problems/${slug}/`,title:q.title,difficulty:q.difficulty.toLowerCase(),topics:q.topicTags.map(t=>t.name)};
    });
  },
};
