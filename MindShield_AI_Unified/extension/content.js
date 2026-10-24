(()=>{
'use strict';
const defaults={enabled:true,images:true,text:true,violence:true,explicit:false,cyber:true,body:true,selfharm:true,sensitivity:'medium',preblur:true,pausedUntil:0};
let cfg={...defaults},generation=0;
const queued=new WeakSet(),cache=new Map(),wrappers=new Set();
let pending=0,started=0,debounce=null;
const MAX=55;
function on(){return cfg.enabled&&Date.now()>=(cfg.pausedUntil||0)}
function allowed(category){return on()&&!!cfg[category]}
function threshold(){return cfg.sensitivity==='high'?.39:cfg.sensitivity==='low'?.68:.52}
function msg(type,data){return new Promise(resolve=>{try{chrome.runtime.sendMessage({type,...data},r=>resolve(chrome.runtime.lastError?{ok:false,error:chrome.runtime.lastError.message}:r||{ok:false}))}catch(e){resolve({ok:false,error:String(e)})}})}
async function count(cat,kind){
 const {stats={}}=await chrome.storage.local.get('stats');
 stats.total=(stats.total||0)+1;stats[kind]=(stats[kind]||0)+1;
 stats.categories=stats.categories||{};stats.categories[cat]=(stats.categories[cat]||0)+1;
 stats.daily=stats.daily||{};const date=new Date().toISOString().slice(0,10);stats.daily[date]=(stats.daily[date]||0)+1;
 await chrome.storage.local.set({stats});
}
async function revealCount(){const {stats={}}=await chrome.storage.local.get('stats');stats.revealed=(stats.revealed||0)+1;await chrome.storage.local.set({stats})}
function wrap(el,category,kind){
 if(!el.isConnected||el.closest('.ms-shell'))return;
 const parent=el.parentNode;if(!parent)return;
 const shell=document.createElement(kind==='images'?'span':'div');
 shell.className='ms-shell'+(kind==='text'?' ms-text-shell':'');
 shell.dataset.category=category;
 parent.insertBefore(shell,el);shell.appendChild(el);
 if(kind==='text')el.classList.add('ms-text');
 const cover=document.createElement('div');cover.className='ms-cover';
 const panel=document.createElement('div');panel.className='ms-panel';
 const title=document.createElement('strong');title.textContent='✦ MindShield AI';
 const info=document.createElement('span');
 const label={violence:'Potential graphic violence',explicit:'Potential explicit imagery',cyber:'Potential harassment',body:'Potential harmful body-image messaging',selfharm:'Potential self-harm promotion'}[category]||'Potentially distressing content';
 info.textContent=label+' · AI prediction, may be incorrect.';
 const button=document.createElement('button');button.textContent='Show anyway';button.type='button';
 button.addEventListener('click',()=>{shell.dataset.revealed='yes';updateShell(shell);revealCount().catch(()=>{})});
 panel.append(title,info,button);cover.append(panel);shell.append(cover);
 wrappers.add(shell);updateShell(shell);count(category,kind).catch(()=>{});
}
function updateShell(shell){shell.classList.toggle('ms-covered',allowed(shell.dataset.category)&&shell.dataset.revealed!=='yes')}
function updateAll(){for(const w of wrappers){if(!w.isConnected){wrappers.delete(w);continue}updateShell(w)}}
function classifyImage(data){
 if(!data?.ok)return null;
 const scores=data.relative_scores||{};
 const best=['violence','explicit'].filter(allowed).sort((a,b)=>(scores[b]||0)-(scores[a]||0))[0];
 if(!best)return null;
 const safe=scores.safe||0;
 // Contrastive ranking: threshold is a heuristic, not a probability.
 return scores[best]>=threshold()&&scores[best]>safe*1.45?best:null;
}
function classifyText(data){
 if(!data?.ok||!data.ranking?.length)return null;
 const top=data.ranking[0];
 if(top.category==='safe'||!allowed(top.category))return null;
 return top.score>=threshold()?top.category:null;
}
async function processImage(el,epoch){
 const url=el.currentSrc||el.src;
 if(!url||!/^https?:/.test(url))return;
 const key='img:'+url;
 let result=cache.get(key);
 if(!result){
  if(cfg.preblur)el.classList.add('ms-processing');
  const response=await msg('classifyImage',{url});
  el.classList.remove('ms-processing');
  result=classifyImage(response);if(response?.ok)cache.set(key,result||'safe');
 }else result=result==='safe'?null:result;
 if(epoch!==generation||!on())return;
 if(result&&allowed(result))wrap(el,result,'images');
}
async function processText(el,epoch){
 const value=(el.innerText||'').trim();
 if(value.length<45||value.length>550)return;
 const key='text:'+value;
 let result=cache.get(key);
 if(!result){
  const response=await msg('classifyText',{text:value});
  result=classifyText(response);if(response?.ok)cache.set(key,result||'safe');
 }else result=result==='safe'?null:result;
 if(epoch!==generation||!on())return;
 if(result&&allowed(result))wrap(el,result,'text');
}
async function runQueue(){
 if(!on())return;
 const images=cfg.images?[...document.querySelectorAll('img')].filter(el=>!queued.has(el)&&!el.closest('.ms-shell')&&el.naturalWidth>=180&&el.naturalHeight>=120&&el.getBoundingClientRect().width>=130).slice(0,35):[];
 const texts=cfg.text?[...document.querySelectorAll('p,blockquote,article li')].filter(el=>!queued.has(el)&&!el.closest('.ms-shell,nav,header,footer,[contenteditable]')&&!el.querySelector('p,li,blockquote')).slice(0,25):[];
 const epoch=generation;
 for(const el of [...images,...texts]){
  if(started>=MAX)break;
  queued.add(el);started++;
  const image=el.tagName==='IMG';
  const job=()=>image?processImage(el,epoch):processText(el,epoch);
  // Limit concurrent ML requests to keep browser and CPU responsive.
  while(pending>=2)await new Promise(r=>setTimeout(r,250));
  pending++;job().catch(()=>{}).finally(()=>pending--);
 }
}
function schedule(){clearTimeout(debounce);debounce=setTimeout(runQueue,650)}
async function init(){
 cfg={...defaults,...await chrome.storage.local.get(Object.keys(defaults))};
 schedule();
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 chrome.storage.onChanged.addListener(ch=>{for(const key of Object.keys(defaults))if(ch[key])cfg[key]=ch[key].newValue;generation++;updateAll();schedule()});
 setInterval(updateAll,12000);
}
init().catch(console.error);
})();