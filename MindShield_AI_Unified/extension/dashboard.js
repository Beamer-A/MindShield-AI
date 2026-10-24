async function render(){
 const {stats={}}=await chrome.storage.local.get('stats');
 for(const key of ['total','images','text','revealed'])document.getElementById(key).textContent=stats[key]||0;
 function bars(id,obj){
  const rows=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const max=Math.max(1,...rows.map(x=>x[1]));
  document.getElementById(id).replaceChildren();
  if(!rows.length){document.getElementById(id).textContent='No activity recorded yet.';return}
  for(const [label,n] of rows){
   const row=document.createElement('div');row.className='barrow';
   const name=document.createElement('span');name.className='barlabel';name.textContent=label;
   const track=document.createElement('div');track.className='track';
   const fill=document.createElement('div');fill.className='fill';fill.style.width=(100*n/max)+'%';
   const count=document.createElement('span');count.textContent=n;
   track.append(fill);row.append(name,track,count);document.getElementById(id).append(row);
  }
 }
 bars('categories',stats.categories);bars('daily',stats.daily);
}
document.getElementById('reset').onclick=async()=>{if(confirm('Reset all MindShield filtering counts?')){await chrome.storage.local.set({stats:{}});render()}};
chrome.storage.onChanged.addListener(render);render();