const API='http://127.0.0.1:5055/api';
const VIDEO_API='http://127.0.0.1:5001/api';
const MAX_BYTES=2_500_000;
async function toDataURL(url){
 const u=new URL(url);
 if(!['http:','https:'].includes(u.protocol))throw Error('Only public HTTP(S) images are supported');
 const r=await fetch(url,{credentials:'omit',redirect:'follow',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Image download HTTP '+r.status);
 const blob=await r.blob();
 if(!blob.type.startsWith('image/'))throw Error('Not an image');
 if(blob.size>MAX_BYTES)throw Error('Image too large');
 return await new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(Error('Image read failed'));reader.readAsDataURL(blob);
 });
}
async function post(endpoint,body){
 const r=await fetch(API+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Inference failed');return j;
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  try{
   if(message.type==='health'){
    const r=await fetch(API+'/health',{signal:AbortSignal.timeout(3500)});
    reply(await r.json());return;
   }
   if(message.type==='videoHealth'){
    const r=await fetch(VIDEO_API+'/health',{signal:AbortSignal.timeout(3500)});reply(await r.json());return;
   }
   if(message.type==='videoAnalyze'){
    if(!sender.tab?.active)throw Error('Keep YouTube tab active');
    const image=await chrome.tabs.captureVisibleTab(sender.tab.windowId,{format:'jpeg',quality:75});
    const r=await fetch(VIDEO_API+'/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,crop:message.crop,viewport:message.viewport}),signal:AbortSignal.timeout(120000)});
    reply(await r.json());return;
   }
   if(message.type==='classifyImage'){
    const image=await toDataURL(message.url);reply(await post('/image',{image}));return;
   }
   if(message.type==='classifyText'){
    reply(await post('/text',{text:message.text}));return;
   }
   reply({ok:false,error:'Unknown action'});
  }catch(e){reply({ok:false,error:String(e.message||e)})}
 })();
 return true;
});
