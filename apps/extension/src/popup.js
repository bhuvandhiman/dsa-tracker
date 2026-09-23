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
  launchStatus.textContent = 'Opening practice journal…';
  try {
    // Re-read on click: LeetCode may have navigated since the popup was opened.
    currentProblem = await readProblem();
    if (!currentProblem) throw new Error('Open a LeetCode problem, then check again.');
    problem.textContent = currentProblem.problemId;
    // Fixed local destination. A page message cannot choose where we open a tab.
    await chrome.tabs.create({ url: DsaRecorder.buildUrl(currentProblem, { title: currentProblem.title }) });
    launchStatus.textContent = 'Journal opened. Review the details and save there.';
  } catch {
    currentProblem = null;
    launchStatus.textContent = 'Could not open the journal. Return to the LeetCode problem and click Check again.';
  } finally {
    opening = false;
    refresh.disabled = false;
    record.disabled = !currentProblem;
  }
}
refresh.addEventListener('click', checkExtension);
record.addEventListener('click', openRecorder);
checkExtension();
