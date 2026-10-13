/* SYNQ Studios — combined social audience, sourced from site data. */
(function(){
 'use strict';
 const target=document.querySelector('[data-social-total]');
 if(!target)return;
 const nf=new Intl.NumberFormat('da-DK');
 fetch('data/social-followers.json?v='+Date.now(),{cache:'no-store'})
  .then(function(res){if(!res.ok)throw new Error('Social data unavailable');return res.json();})
  .then(function(data){
   const p=data&&data.platforms;
   if(!p)return;
   const values=[p.tiktok,p.instagram,p.youtube,p.spotify];
   if(values.some(function(v){return !Number.isSafeInteger(v)||v<0;}))return;
   const total=values.reduce(function(a,b){return a+b;},0);
   if(Number.isSafeInteger(total))target.textContent=nf.format(total);
  })
  .catch(function(){/* Keep the initial total if data is temporarily unavailable. */});
})();
