import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { candidatesFromResults, normaliseName, searchQuery } from './core.mjs';

const root = new URL('./', import.meta.url);
const captured = JSON.parse(await readFile(new URL('captured-searches.json', root), 'utf8'));
export async function lookup(name, context, { key = process.env.BRAVE_SEARCH_API_KEY, fetcher = fetch } = {}) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 || typeof context !== 'string' || context.length > 100) {
    return { status: 400, body: { error: 'Enter a name between 2 and 100 characters, with up to 100 characters of company or location.' } };
  }
  const query = searchQuery(name, context);
  if (!key) {
    const sample = captured.searches.find(s => normaliseName(s.name) === normaliseName(name) && normaliseName(s.context) === normaliseName(context));
    if (!sample) return { status: 503, body: { code: 'SEARCH_NOT_CONNECTED', error: 'Fresh search is not connected in this test. Try Tek Kan Chung (no location) or Alex Smith + London, or paste your link.', query } };
    return { status: 200, body: { candidates: candidatesFromResults(sample.results, name), mode: 'captured', capturedOn: captured.capturedOn, query: sample.query } };
  }
  const endpoint = new URL('https://api.search.brave.com/res/v1/web/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('count', '10');
  endpoint.searchParams.set('country', 'GB');
  endpoint.searchParams.set('search_lang', 'en');
  try {
    const response = await fetcher(endpoint, { headers: { 'X-Subscription-Token': key, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { status: response.status === 429 ? 429 : 502, body: { error: response.status === 429 ? 'Search is busy. Try again shortly or paste your link.' : 'The search service could not complete this lookup. Try again or paste your link.' } };
    const data = await response.json();
    return { status: 200, body: { candidates: candidatesFromResults(data.web?.results, name), mode: 'live', query } };
  } catch { return { status: 502, body: { error: 'Search could not finish. Try again or paste your link.' } }; }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const reply = (status, body, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET') return reply(405, { error: 'Method not allowed.' });
      if (url.pathname === '/api/status') return reply(200, { mode: process.env.BRAVE_SEARCH_API_KEY ? 'live' : 'captured', capturedOn: captured.capturedOn });
      if (url.pathname === '/api/search') {
        const result = await lookup(url.searchParams.get('name') || '', url.searchParams.get('context') || '');
        return reply(result.status, result.body);
      }
      const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.mjs': ['app.mjs', 'text/javascript; charset=utf-8'], '/core.mjs': ['core.mjs', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
      const asset = files[url.pathname];
      if (!asset) return reply(404, { error: 'Not found.' });
      reply(200, await readFile(new URL(asset[0], root)), asset[1]);
    } catch { reply(500, { error: 'The test could not complete that request.' }); }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 4178);
  createServer().listen(port, '127.0.0.1', () => console.log(`Hi Again search test: http://127.0.0.1:${port} (${process.env.BRAVE_SEARCH_API_KEY ? 'live search' : 'captured real search results'})`));
}
