const worker = document.querySelector('#worker');
const problem = document.querySelector('#problem');
const refresh = document.querySelector('#refresh');
const record = document.querySelector('#record');
const launchStatus = document.querySelector('#launch-status');
let checking = false;
let opening = false;
let currentProblem = null;

async function readProblem() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_PROBLEM' });
  if (response?.status !== 'content-script-ready') throw new Error('Unexpected reply. Reload the extension and refresh this page.');
  if (response.problem === null) return null;
  const identity = DsaAdapters.map((adapter) => adapter.getProblem(response.problem?.url)).find(Boolean);
  if (!identity || identity.platform !== response.problem.platform || identity.problemId !== response.problem.problemId) {
    throw new Error('Unexpected reply. Reload the extension and refresh this page.');
  }
  return { ...identity, title: typeof response.problem.title === 'string' ? response.problem.title : undefined };
}

async function checkExtension() {
  if (checking || opening) return;
  checking = true;
  refresh.disabled = true;
  record.disabled = true;
  currentProblem = null;
  launchStatus.textContent = '';
  worker.textContent = 'Checking extension…';
  problem.textContent = 'Checking this tab…';
  const apiStatus=document.querySelector('#api');
  const accountStatus=document.querySelector('#account');
  if(accountStatus){
    accountStatus.textContent='Checking LeetCode sign-in…';
    chrome.tabs.query({url:'https://leetcode.com/*'}).then(async tabs=>{
      const tab=tabs.find(item=>item.active)||tabs[0];if(!tab)throw new Error('Open a signed-in LeetCode tab.');
      const data=await chrome.tabs.sendMessage(tab.id,{type:'GET_ACCOUNT_STATUS'});
      if(!data.username)throw new Error(data.error||'Refresh LeetCode after reloading Recall.');
      accountStatus.textContent='LeetCode signed in as '+data.username;
    }).catch(error=>{accountStatus.textContent=error.message;});
  }
  if(apiStatus){
    apiStatus.textContent='Checking local API and database…';
    fetch('http://127.0.0.1:3001/api/ready',{signal:AbortSignal.timeout(10000),credentials:'omit',redirect:'error'}).then(async response=>{
      const data=await response.json();if(!response.ok||data.status!=='ready')throw new Error(data.error||'Database is not ready.');
      apiStatus.textContent=`API ready · database connected · ${data.account?'workspace account: '+data.account:'account binds on first recording or import'}`;
    }).catch(error=>{apiStatus.textContent='Local API/database unavailable. Start Recall, then Check again. '+error.message;});
  }
  try {
    const response = await chrome.runtime.sendMessage({ type: 'PING' });
    worker.textContent = response?.status === 'worker-ready' ? `Extension loaded · v${response.version}` : 'Service worker did not respond as expected.';
  } catch {
    worker.textContent = 'Could not reach the service worker. Reload the extension.';
  }
  try {
    currentProblem = await readProblem();
    problem.textContent = currentProblem ? currentProblem.problemId : 'Content script ready. Open a LeetCode problem to identify it.';
  } catch (error) {
    problem.textContent = error.message.startsWith('Unexpected reply') ? error.message : 'Open a problem on leetcode.com, then refresh that page if the extension was just loaded.';
  } finally {
    checking = false;
    refresh.disabled = false;
    record.disabled = !currentProblem;
  }
}

async function openRecorder() {
  if (checking || opening || !currentProblem) return;
  opening = true;
  record.disabled = true;
  refresh.disabled = true;
  launchStatus.textContent = 'Opening recording panel…';
  try {
    // Re-read on click: LeetCode may have navigated since the popup was opened.
    currentProblem = await readProblem();
    if (!currentProblem) throw new Error('Open a LeetCode problem, then check again.');
    problem.textContent = currentProblem.problemId;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_RECORDER' });
    if (!result?.opened) throw new Error('Panel unavailable');
    window.close();
  } catch {
    currentProblem = null;
    launchStatus.textContent = 'Could not open the panel. Return to the LeetCode problem and click Check again.';
  } finally {
    opening = false;
    refresh.disabled = false;
    record.disabled = !currentProblem;
  }
}
refresh.addEventListener('click', checkExtension);
record.addEventListener('click', openRecorder);
checkExtension();
