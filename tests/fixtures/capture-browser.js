/* Browser-only test harness; no extension permissions or real submission calls. */
let href = 'https://leetcode.com/problems/two-sum/';
let submissionId = 1000;
const pageLabel = document.querySelector('#page');
const result = document.querySelector('#result');
const showPage = () => { pageLabel.textContent = href; };
const simulatedPage = {
  get location() { return { href }; },
  setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
  addEventListener: window.addEventListener.bind(window),
};
let pending = null; let saves = 0;
const simulatedRuntime = { async sendMessage(message) {
  if (message.type === 'GET_PRACTICE_CONTEXT') return {units:[{slug:'hashing',name:'Hash maps & sets'},{slug:'two-pointers',name:'Two pointers'},{slug:'other',name:'Needs classification'}],practiceUnit:'hashing'};
  if (message.type === 'GET_PENDING_CAPTURE') return { pending };
  pending = message.payload;
  if (document.querySelector('#offline').checked) return { saved: false, error: 'API offline. Retry save.' };
  document.querySelector('#opened').textContent = 'Saved ' + (++saves) + ' recording: ' + JSON.stringify(pending);
  pending = null;
  return { saved: true };
} };
DsaCapture.start(document, simulatedPage, simulatedRuntime);
document.querySelector('#submit').addEventListener('click', () => {
  const problem = DsaAdapters[0].getProblem(href);
  href = problem.url + 'submissions/' + (++submissionId) + '/';
  result.textContent = 'Pending'; showPage();
  setTimeout(() => { result.textContent = document.querySelector('#verdict').value; }, 350);
});
document.querySelector('#run').addEventListener('click', () => { result.textContent = 'Accepted'; });
document.querySelector('#old').addEventListener('click', () => { href = DsaAdapters[0].getProblem(href).url + 'submissions/999/'; result.textContent = 'Accepted'; showPage(); window.dispatchEvent(new PopStateEvent('popstate')); });
document.querySelector('#navigate').addEventListener('click', () => {
  href = 'https://leetcode.com/problems/3sum/';
  const title = document.querySelector('#title'); title.href = href; title.textContent = '15. 3Sum';
  result.textContent = ''; showPage();
});
showPage();
