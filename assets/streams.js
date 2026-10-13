/* SYNQ Studios — public totals from Apple Music, Spotify and YouTube.
   Only the Udgivelser page loads this script and sorts tracks by their totals. */
(function(){
 'use strict';
 const fields=document.querySelectorAll('[data-stream-id]');
 if(!fields.length)return;
 const source=document.querySelector('script[data-streams-src]');
 const url=source&&source.dataset.streamsSrc;
 if(!url)return;
 const list=document.querySelector('[data-sort-streams="desc"]');
 const nf=new Intl.NumberFormat('da-DK');
 const df=new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Copenhagen'});
 function totalFor(entry){
  if(!entry)return null;
  const counts=[entry.am,entry.sp,entry.yt];
  if(counts.some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0)))return null;
  if(counts.every(v=>v===null))return null;
  const total=counts.reduce((sum,v)=>sum+(v===null?0:v),0);
  return Number.isSafeInteger(total)?total:null;
 }
 fetch(url+(url.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store'})
  .then(function(res){if(!res.ok)throw new Error('Data unavailable');return res.json();})
  .then(function(data){
   const tracks=data&&data.tracks||{};
   fields.forEach(function(node){
    const entry=tracks[node.dataset.streamId];
    const total=totalFor(entry);
    if(total===null)return;
    node.textContent=nf.format(total)+' streams';   });
   const updatedTime=document.querySelector('.streams-updated time');
   if(updatedTime){
    const validDates=Object.values(tracks)
     .map(function(entry){return entry&&entry.updatedAt;})
     .filter(function(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'');})
     .sort();
    if(validDates.length){
     const latest=validDates[validDates.length-1];
     updatedTime.dateTime=latest;
     updatedTime.textContent=df.format(new Date(latest+'T12:00:00Z'));
    }
   }
   if(list){
    const rows=Array.from(list.children).filter(function(node){return node.matches('a.track');});
    const ranked=rows.map(function(node,index){
     const field=node.querySelector('[data-stream-id]');
     const entry=field&&tracks[field.dataset.streamId];
     return {node:node,index:index,total:totalFor(entry)};
    });
    ranked.sort(function(a,b){
     const left=a.total===null?-1:a.total;
     const right=b.total===null?-1:b.total;
     return right-left||a.index-b.index;
    });
    ranked.forEach(function(item){list.appendChild(item.node);});
   }
  })
  .catch(function(){/* Keep server-rendered ranking if the data request fails. */});
})();
