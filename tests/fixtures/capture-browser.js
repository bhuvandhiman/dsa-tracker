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
const simulatedRuntime = { async sendMessage(message) {
  const url = DsaRecorder.buildUrl(message.problem, { title: message.problem.title, attemptedAt: message.attemptedAt });
  const target = document.querySelector('#opened');
  target.textContent = 'Recorder URL: ' + url;
  return { opened: true };
} };
DsaCapture.start(document, simulatedPage, simulatedRuntime);
document.querySelector('#submit').addEventListener('click', () => {
  const problem = DsaAdapters[0].getProblem(href);
  href = problem.url + 'submissions/' + (++submissionId) + '/';
  result.textContent = 'Pending'; showPage();
  setTimeout(() => { result.textContent = document.querySelector('#verdict').value; }, 350);
});
document.querySelector('#run').addEventListener('click', () => { result.textContent = 'Accepted'; });
document.querySelector('#old').addEventListener('click', () => { href = DsaAdapters[0].getProblem(href).url + 'submissions/999/'; result.textContent = 'Accepted'; showPage(); });
document.querySelector('#navigate').addEventListener('click', () => {
  href = 'https://leetcode.com/problems/3sum/';
  const title = document.querySelector('#title'); title.href = href; title.textContent = '15. 3Sum';
  result.textContent = ''; showPage();
});
showPage();
