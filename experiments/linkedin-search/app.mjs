import { profileUrl, normaliseName } from './core.mjs';
const $ = id => document.getElementById(id);
let requestId = 0, controller, candidates = [];
const storageKey = name => `hiagain-linkedin-test:${normaliseName(name)}`;
const text = (tag, content, className) => { const node = document.createElement(tag); node.textContent = content; if (className) node.className = className; return node; };
const clearError = () => { $('error').hidden = true; $('error').textContent = ''; };
const error = message => { $('error').textContent = message; $('error').hidden = false; };
function readSaved() {
  try { const saved = JSON.parse(localStorage.getItem(storageKey($('name').value))); return saved && profileUrl(saved.url) ? saved : null; } catch { return null; }
}
function invalidate() {
  requestId++; controller?.abort(); candidates = [];
  $('results').replaceChildren(); $('results-area').hidden = true;
  $('search-button').disabled = false; $('search-button').textContent = 'Find my LinkedIn ↗';
  $('status').textContent = ''; clearError();
}
function renderProfile() {
  const name = $('name').value.trim() || 'Your profile';
  $('profile-name').textContent = name;
  document.querySelector('.avatar').textContent = name.split(/\s+/).slice(0,2).map(w => [...w][0]).join('').toUpperCase();
  const saved = readSaved();
  $('finder').hidden = !!saved; $('linked').hidden = !saved;
  $('profile-state').textContent = saved ? 'LinkedIn added for this test' : 'LinkedIn not added';
  $('linked').replaceChildren();
  if (!saved) return;
  $('linked').append(text('h3','LinkedIn added ✓','saved-title saved-mark'),text('p','People can now open the link you chose.','saved-note'),text('p',saved.url,'saved-url'));
  const actions = document.createElement('div'); actions.className = 'saved-actions';
  const open = text('a','Open LinkedIn ↗','primary'); open.href = profileUrl(saved.url); open.target = '_blank'; open.rel = 'noopener noreferrer';
  const change = text('button','Change','text-button'); change.type = 'button'; change.id = 'change-link'; change.onclick = () => { try { localStorage.removeItem(storageKey(name)); } catch {} invalidate(); renderProfile(); $('name').focus(); };
  actions.append(open,change); $('linked').append(actions);
}
function save(url, source) {
  const clean = profileUrl(url);
  if (!clean) { error('Use a LinkedIn personal profile link, such as linkedin.com/in/your-name.'); return; }
  if ($('name').value.trim().length < 2) { error('Enter your name first so this test can keep the link with the right profile.'); $('name').focus(); return; }
  try { localStorage.setItem(storageKey($('name').value), JSON.stringify({ url: clean, source, savedAt: new Date().toISOString() })); }
  catch { error('This browser could not save the link. Allow local storage and try again.'); return; }
  invalidate(); renderProfile(); $('linked').setAttribute('tabindex','-1'); $('linked').focus();
}
function renderCandidates() {
  $('results').replaceChildren(); $('results-area').hidden = false;
  for (const candidate of candidates) {
    const card = document.createElement('article'); card.className = 'candidate';
    card.append(text('h4',candidate.title),text('p',candidate.description),text('span',candidate.url.replace(/^https?:\/\//,''),'url'));
    const actions = document.createElement('div'); actions.className = 'candidate-actions';
    const confirm = text('button',"That’s me",'primary'); confirm.type = 'button'; confirm.onclick = () => save(candidate.url,'confirmed-search');
    const inspect = text('a','View profile ↗','external'); inspect.href = candidate.url; inspect.target = '_blank'; inspect.rel = 'noopener noreferrer';
    actions.append(confirm,inspect); card.append(actions); $('results').append(card);
  }
}
async function search(event) {
  event?.preventDefault(); invalidate();
  if (!$('search-form').reportValidity()) return;
  const id = requestId, name = $('name').value.trim(), context = $('context').value.trim();
  controller = new AbortController(); $('search-button').disabled = true; $('search-button').textContent = 'Finding profiles…'; $('status').textContent = 'Looking for your LinkedIn profile…';
  try {
    const response = await fetch(`/api/search?${new URLSearchParams({name,context})}`, { signal: controller.signal });
    const data = await response.json();
    if (id !== requestId) return;
    if (!response.ok) { $('status').textContent = ''; error(data.error || 'Search could not finish. Please try again.'); return; }
    candidates = (data.candidates || []).filter(c => profileUrl(c.url)).map(c => ({...c,url:profileUrl(c.url)}));
    $('status').textContent = data.mode === 'captured' ? 'Real search results captured on 1 November 2026 · not a fresh lookup.' : 'Fresh public search results · details may be out of date.';
    if (!candidates.length) { $('status').textContent += ' No matching profiles found. Try adding a company or location, or paste your link.'; $('paste').open = true; }
    else renderCandidates();
  } catch (e) { if (e.name !== 'AbortError' && id === requestId) { $('status').textContent = ''; error('Search could not finish. Please try again or paste your link.'); } }
  finally { if (id === requestId) { $('search-button').disabled = false; $('search-button').textContent = 'Find my LinkedIn ↗'; } }
}
$('search-form').addEventListener('submit',search);
for (const id of ['name','context']) $(id).addEventListener('input',() => { invalidate(); renderProfile(); });
$('paste-form').addEventListener('submit',event => { event.preventDefault(); clearError(); save($('url').value,'pasted'); });
$('none').onclick = () => { invalidate(); $('context').focus(); $('status').textContent = 'Add a company or location to narrow the search, or paste your profile link below.'; };
document.querySelectorAll('[data-sample]').forEach(button => button.onclick = () => {
  invalidate(); $('name').value = button.dataset.sample === 'tek' ? 'Tek Kan Chung' : 'Alex Smith'; $('context').value = button.dataset.sample === 'tek' ? '' : 'London'; renderProfile(); if (!readSaved()) search();
});
renderProfile();
try {
  const response = await fetch('/api/status'); if (!response.ok) throw new Error(); const status = await response.json();
  $('mode').textContent = status.mode === 'live' ? 'Fresh search connected' : 'Captured real search results';
  $('mode-detail').textContent = status.mode === 'live' ? 'Searches use Brave Search. Your name and optional company/location are sent to the search service.' : 'This trial includes real searches captured on 1 November for Tek Kan Chung and Alex Smith + London. Other names need a connected search service. No LinkedIn sign-in is connected.';
  if (!readSaved()) search();
} catch { $('mode').textContent = 'Search connection unavailable'; $('mode-detail').textContent = 'Start the local test server to search. You can still paste a profile link.'; }
