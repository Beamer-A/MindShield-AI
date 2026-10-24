const DEFAULT={enabled:true,images:true,text:true,violence:true,explicit:false,cyber:true,body:true,selfharm:true,sensitivity:'medium',preblur:true,pausedUntil:0};
const categories=[['images','Analyze webpage images','CLIP visual model'],['violence','Graphic violence','Image detection'],['explicit','Explicit imagery','Experimental image detection'],['text','Analyze webpage text','NLI text model'],['cyber','Cyberbullying / harassment','Text detection'],['body','Harmful body-image messaging','Text detection'],['selfharm','Self-harm promotion','Text detection']];
let cfg={};
async function render(){
 cfg={...DEFAULT,...await chrome.storage.local.get(Object.keys(DEFAULT))};
 const {stats={}}=await chrome.storage.local.get('stats');
 document.getElementById('enabled').checked=cfg.enabled;
 document.getElementById('preblur').checked=cfg.preblur;
 document.getElementById('sensitivity').value=cfg.sensitivity;
 document.getElementById('count').textContent=stats.total||0;
 document.getElementById('status').textContent=Date.now()<cfg.pausedUntil?'Temporarily paused':cfg.enabled?'Protection enabled':'Protection disabled';
 document.getElementById('pause').textContent=Date.now()<cfg.pausedUntil?'Resume':'Pause 10 min';
 document.getElementById('categories').innerHTML=categories.map(([k,label,sub])=>`<label class="row category"><span><strong>${label}</strong><small>${sub}</small></span><input class="toggle" type="checkbox" data-key="${k}" ${cfg[k]?'checked':''}></label>`).join('');
}
document.addEventListener('change',async e=>{
 const k=e.target.dataset.key||e.target.id;
 if(k in DEFAULT)await chrome.storage.local.set({[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
});
document.getElementById('pause').onclick=async()=>{await chrome.storage.local.set({pausedUntil:Date.now()<cfg.pausedUntil?0:Date.now()+600000});render()};
document.getElementById('dashboard').onclick=()=>chrome.runtime.openOptionsPage();
chrome.storage.onChanged.addListener(render);
render();
chrome.runtime.sendMessage({type:'health'},res=>{document.getElementById('backend').textContent=chrome.runtime.lastError||!res?.ok?'⚠ AI engine offline — start backend/server.py':'✓ Local AI engine connected';});

// Video preferences are isolated from webpage filtering preferences.
const VIDEO_DEFAULT={enabled:true,nudity:true,sexual:true,violence:true,gore:true,profanity:true,drugs:true,disturbing:true,autoskip:true,muteProfanity:true,sensitivity:'balanced',skipSeconds:5};
const VIDEO_LABELS={nudity:'Nudity',sexual:'Kissing / sexual scenes',violence:'Physical violence',gore:'Blood / injuries',profanity:'Profanity in captions',drugs:'Smoking / alcohol / drugs',disturbing:'Horror / disturbing scenes'};
const vc=document.getElementById('video_categories');
for(const [key,label] of Object.entries(VIDEO_LABELS)){
 const row=document.createElement('label');row.className='row category';
 const span=document.createElement('span');span.textContent=label;
 const input=document.createElement('input');input.type='checkbox';input.className='toggle';input.dataset.videoKey=key;
 row.append(span,input);vc.append(row);
}
async function renderVideo(){const saved=await chrome.storage.local.get(Object.keys(VIDEO_DEFAULT).map(k=>'video_'+k));for(const [k,v] of Object.entries(VIDEO_DEFAULT)){const el=document.getElementById('video_'+k)||document.querySelector(`[data-video-key="${k}"]`);if(!el)continue;const value=saved['video_'+k]??v;if(el.type==='checkbox')el.checked=value;else el.value=value;}}
document.addEventListener('change',async e=>{const k=e.target.dataset.videoKey||(e.target.id.startsWith('video_')?e.target.id.slice(6):null);if(k&&k in VIDEO_DEFAULT){const value=e.target.type==='checkbox'?e.target.checked:k==='skipSeconds'?Math.max(1,Math.min(30,Number(e.target.value)||5)):e.target.value;await chrome.storage.local.set({['video_'+k]:value});}});
renderVideo();chrome.runtime.sendMessage({type:'videoHealth'},res=>{document.getElementById('video_backend').textContent=chrome.runtime.lastError||!res?.ok?'⚠ Video AI offline — start backend/video_server.py':'✓ YouTube video AI connected';});
