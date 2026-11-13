import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { createServer } from './server.mjs';
import { fileURLToPath } from 'node:url';

const chromium = process.env.CHROMIUM_PATH || 'C:/Users/tekka/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';
const dir = fileURLToPath(new URL('./',import.meta.url));
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const server = createServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(new URL('verification/',import.meta.url),{recursive:true});
const browser = spawn(chromium,['--headless','--no-sandbox','--disable-gpu','--remote-debugging-port=9338',`--user-data-dir=${dir}/verification/browser-profile`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try {
  let target;
  for(let i=0;i<70;i++){try {target=await (await fetch(`http://127.0.0.1:9338/json/new?${encodeURIComponent(base)}`,{method:'PUT'})).json();break;}catch {await sleep(100);}}
  if(!target) throw Error('Browser did not start');
  ws=new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let seq=0; const pending=new Map(); ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const run=async expression=>{const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);return result.result.value;};
  await cdp('Page.enable'); await cdp('Runtime.enable');
  const evidence=[];
  for(const width of [390,320,1000]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<700});
    await cdp('Page.navigate',{url:base});
    for(let i=0;i<60;i++){if(await run(`!!document.querySelector('#name') && !!document.querySelector('#results .candidate')`))break;await sleep(100);}
    const result=await run(`(async()=>{
      const checks=[];const $=id=>document.getElementById(id);const check=(name,value)=>{if(!value)throw Error(name);checks.push(name)};
      const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out waiting for UI');};
      const input=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('input',{bubbles:true}));};
      const search=()=>{$('search-form').requestSubmit();};
      localStorage.clear();input('name','Tek Kan Chung');input('context','');search();await wait(()=>document.querySelector('.candidate'));
      check('Exact-name candidate from actual search',document.querySelector('.candidate').textContent.includes('Tek Kan Chung'));
      check('Only one exact-name candidate',document.querySelectorAll('.candidate').length===1);
      check('Captured source disclosed',$('status').textContent.includes('not a fresh lookup'));
      check('Nothing saved before confirmation',localStorage.length===0);
      check('No horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
      check('Review link safe and external',document.querySelector('.candidate a').href==='https://uk.linkedin.com/in/tek-kan-chung'&&document.querySelector('.candidate a').rel.includes('noopener'));
      check('Confirmation touch target',document.querySelector('.candidate button').getBoundingClientRect().height>=44);
      document.querySelector('.candidate button').click();
      check('Explicit confirmation saves locally',localStorage.length===1&&!$('linked').hidden);
      check('Correct confirmed destination',$('linked').querySelector('a').href==='https://uk.linkedin.com/in/tek-kan-chung');
      check('No verification claim',$('linked').textContent.includes('LinkedIn added')&&!$('linked').textContent.includes('verified'));
      $('change-link').click();check('Change removes old link and returns inline',!$('finder').hidden&&localStorage.length===0);
      input('url','https://linkedin.com.evil.test/in/tek');$('paste-form').requestSubmit();
      check('Deceptive link rejected',!$('error').hidden&&localStorage.length===0);
      input('url','https://www.linkedin.com/in/tek-kan-chung?trk=x');$('paste-form').requestSubmit();
      check('Paste accepted without tracking',$('linked').querySelector('a').href==='https://www.linkedin.com/in/tek-kan-chung');
      $('change-link').click();document.querySelector('[data-sample=alex]').click();await wait(()=>document.querySelectorAll('.candidate').length===4);
      check('Common name offers multiple actual candidates',document.querySelectorAll('.candidate').length===4);
      check('Company context shown',document.querySelector('.candidate').textContent.includes('Obama Foundation'));
      check('No candidate chosen automatically',localStorage.length===0);
      $('none').click();check('None focuses refinement without saving',document.activeElement.id==='context'&&localStorage.length===0&&$('results-area').hidden);
      input('name','Unknown Person');input('context','');search();await wait(()=>!$('error').hidden);
      check('Unconnected fresh search shown honestly',$('error').textContent.includes('Fresh search is not connected'));
      check('No stale candidates after failed search',document.querySelectorAll('.candidate').length===0);
      input('name','Tek Kan Chung');search();input('name','Another Person');await new Promise(r=>setTimeout(r,150));
      check('Editing during search prevents stale results',document.querySelectorAll('.candidate').length===0&&$('profile-name').textContent==='Another Person');
      document.querySelector('[data-sample=tek]').click();await wait(()=>document.querySelector('.candidate'));
      check('Sample restored without a forced setup screen',!$('finder').hidden&&$('profile-name').textContent==='Tek Kan Chung');
      check('Final layout fits',document.documentElement.scrollWidth<=innerWidth);
      return checks;
    })()`);
    await sleep(300);
    const capture=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await writeFile(new URL(`verification/search-${width}.png`,import.meta.url),Buffer.from(capture.data,'base64'));
    evidence.push({width,passed:result.length,checks:result});
  }
  await writeFile(new URL('verification/browser-results.json',import.meta.url),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence.map(({width,passed})=>({width,passed})),null,2));
}finally{ws?.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
