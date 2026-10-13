/* SYNQ Studios public stream counts — Apple Music + Spotify + YouTube. */
(function(){
 const fields=document.querySelectorAll('[data-stream-id]');
 if(!fields.length)return;
 const source=document.querySelector('script[data-streams-src]');
 const url=source&&source.dataset.streamsSrc;
 if(!url)return;
 const nf=new Intl.NumberFormat('da-DK');
 const df=new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Copenhagen'});
 fetch(url+(url.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store'})
  .then(function(res){if(!res.ok)throw new Error('Data unavailable');return res.json();})
  .then(function(data){
   const tracks=data&&data.tracks||{};
   fields.forEach(function(node){
    const entry=tracks[node.dataset.streamId];
    if(!entry)return;
    const counts=[entry.am,entry.sp,entry.yt];
    if(counts.some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0)))return;
    if(counts.every(v=>v===null))return;
    const total=counts.reduce((sum,v)=>sum+(v===null?0:v),0);
    if(!Number.isSafeInteger(total))return;
    const date=/^\d{4}-\d{2}-\d{2}$/.test(entry.updatedAt||'')
     ?' (opdateret '+df.format(new Date(entry.updatedAt+'T12:00:00Z'))+')':'';
    node.textContent=nf.format(total)+' streams'+date;
   });
  })
  .catch(function(){/* Show placeholder when figures cannot be verified. */});
})();
