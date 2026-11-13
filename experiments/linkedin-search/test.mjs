import test from 'node:test';
import assert from 'node:assert/strict';
import { profileUrl, searchQuery, candidatesFromResults } from './core.mjs';
import { lookup, createServer } from './server.mjs';

test('accepts personal profile links and removes tracking', () => {
  assert.equal(profileUrl(' uk.linkedin.com/in/tek-kan-chung/?trk=x#bio '),'https://uk.linkedin.com/in/tek-kan-chung');
  assert.equal(profileUrl('linkedin.com/in/a-person'),'https://linkedin.com/in/a-person');
  assert.equal(profileUrl('http://www.linkedin.com/in/a-person'),'https://www.linkedin.com/in/a-person');
  assert.ok(profileUrl('https://www.linkedin.com/in/%E6%9D%8E'));
});
test('rejects unsafe, unrelated, redirect and non-person URLs', () => {
  for (const value of ['javascript:alert(1)','https://linkedin.com.evil.test/in/tek','https://linkedin.com@evil.test/in/tek','https://user:pass@linkedin.com/in/tek','https://www.linkedin.com/company/hiagain','https://www.linkedin.com/posts/abc','https://www.linkedin.com/in/tek/extra','https://www.linkedin.com/in/%2f%2fevil','https://www.linkedin.com/in/%ZZ','https://www.linkedin.com:8443/in/tek','https://www.linkedin.com/in/..','https://www.linkedin.com/in/']) assert.equal(profileUrl(value),null,value);
});
test('builds a name search without guessing a URL', () => {
  assert.equal(searchQuery('Tek Kan Chung'),'site:linkedin.com/in/ "Tek Kan Chung"');
  assert.ok(!searchQuery('Alex" site:evil.test').includes('site:evil'));
});
test('filters mentions, companies, duplicate regional URLs and title mismatches', () => {
  const results = [
    { title:'Tek Kan Chung - FE fundinfo | LinkedIn', url:'https://uk.linkedin.com/in/tek-kan-chung',description:'<b>London</b>' },
    { title:'Tek Kan Chung | LinkedIn',url:'https://www.linkedin.com/in/tek-kan-chung?trk=duplicate' },
    { title:'Jacob Anderson | LinkedIn',url:'https://www.linkedin.com/in/jacob',description:'Tek Kan Chung liked this' },
    { title:'Tek Kan Chung | LinkedIn',url:'https://www.linkedin.com/company/not-person' },
    { title:'Tek Chung | LinkedIn',url:'https://www.linkedin.com/in/tekchung' }
  ];
  const candidates = candidatesFromResults(results,'Tek Kan Chung');
  assert.equal(candidates.length,1); assert.equal(candidates[0].description,'London');
  assert.equal(candidatesFromResults(results,'!!!').length,0);
});
test('captured searches are explicit and do not fabricate matches for new names',async () => {
  const tek = await lookup('Tek Kan Chung','',{key:''});
  assert.equal(tek.body.mode,'captured'); assert.equal(tek.body.candidates.length,1); assert.equal(tek.body.candidates[0].url,'https://uk.linkedin.com/in/tek-kan-chung');
  assert.equal((await lookup('Alex Smith','London',{key:''})).body.candidates.length,4);
  assert.equal((await lookup('Unknown Person','',{key:''})).status,503);
  assert.equal((await lookup('Tek Kan Chung','Cambridge',{key:''})).status,503);
  assert.equal((await lookup('x','',{key:''})).status,400);
  assert.equal((await lookup('x'.repeat(101),'',{key:''})).status,400);
});
test('live adapter queries only the search provider with a server-side key',async () => {
  let called = false;
  const response = await lookup('Tek Kan Chung','London',{key:'test-secret',fetcher:async (url,options) => {
    called = true; assert.equal(url.hostname,'api.search.brave.com'); assert.ok(url.searchParams.get('q').includes('London')); assert.equal(options.headers['X-Subscription-Token'],'test-secret');
    return {ok:true,json:async()=>({web:{results:[{title:'Tek Kan Chung | LinkedIn',url:'https://uk.linkedin.com/in/tek-kan-chung'}]}})};
  }});
  assert.ok(called); assert.equal(response.body.mode,'live'); assert.equal(response.body.candidates.length,1); assert.ok(!JSON.stringify(response).includes('test-secret'));
});
test('live adapter handles zero results, throttling, provider failures and timeouts',async () => {
  const options = fetcher => ({key:'test-secret',fetcher});
  assert.equal((await lookup('Tek Kan Chung','',options(async()=>({ok:true,json:async()=>({})})))).body.candidates.length,0);
  for (const status of [401,429,500]) assert.equal((await lookup('Tek Kan Chung','',options(async()=>({ok:false,status})))).status,status===429?429:502);
  assert.equal((await lookup('Tek Kan Chung','',options(async()=>{throw Error('timeout and secret')}))).status,502);
});
test('HTTP serves only allowlisted assets, not credentials or source data',async () => {
  const server = createServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base)).status,200);
    assert.equal((await fetch(base+'/captured-searches.json')).status,404);
    assert.equal((await fetch(base+'/server.mjs')).status,404);
    assert.equal((await fetch(base+'/.env')).status,404);
    assert.equal((await fetch(base+'/api/search',{method:'POST'})).status,405);
    const res = await fetch(base+'/api/status'); assert.ok(res.headers.get('content-security-policy')); assert.ok(!JSON.stringify(await res.json()).includes('key'));
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
