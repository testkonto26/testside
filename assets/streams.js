/* SYNQ Studios public stream counts — no credentials on public pages. */
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
        if(!entry||!Number.isSafeInteger(entry.streams)||entry.streams<0)return;
        const date=/^\d{4}-\d{2}-\d{2}$/.test(entry.updatedAt||'')
          ?' (opdateret '+df.format(new Date(entry.updatedAt+'T12:00:00Z'))+')':'';
        node.textContent=nf.format(entry.streams)+' streams'+date;
      });
    })
    .catch(function(){/* Keep honest placeholder when data is not available. */});
})();
