/* SYNQ Studios admin. Token is used only in direct requests to api.github.com.
   No credentials are persisted in localStorage, cookies, or repository files. */
(function(){
'use strict';
const songs=[
  ['naar-lyset-slukker','Når Lyset Slukker'],
  ['stadig-her','Stadig her'],
  ['bliv-i-nat','Bliv i nat'],
  ['nav-dile-min','Nav Dilê Min'],
  ['ya-layali','Ya Layali'],
  ['cest-la-vie','C’est La Vie'],
  ['jeg-sagde-det-fint','Jeg Sagde Det Fint'],
  ['yine','Yine'],
  ['efter-solnedgang','Efter Solnedgang'],
  ['seven-direj','Şevên Dirêj']
];
const api='https://api.github.com/repos/testkonto26/testside/contents/data/streams.json';
const publicData='../data/streams.json';
const form=document.getElementById('stream-form');
const token=document.getElementById('github-token');
const save=document.getElementById('save');
const reload=document.getElementById('reload');
const status=document.getElementById('status');
const list=document.getElementById('stream-fields');
let snapshot=null;
const inputs=new Map();
const notes=new Map();
const nf=new Intl.NumberFormat('da-DK');
const df=new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Copenhagen'});
function setStatus(message,kind){
  status.textContent=message;
  status.dataset.kind=kind||'info';
}
function setBusy(value){
  save.disabled=value||!snapshot;
  reload.disabled=value;
  save.textContent=value?'Gemmer…':'Gem ændringer';
}
function dateLabel(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'Endnu ikke opdateret';
  return 'Senest opdateret '+df.format(new Date(value+'T12:00:00Z'));
}
function validCount(v){return v===null||(Number.isSafeInteger(v)&&v>=0);}
function validate(data){
  if(!data||typeof data!=='object'||!data.tracks||typeof data.tracks!=='object')throw Error('Datafilen har et uventet format.');
  for(const [slug] of songs){
    const entry=data.tracks[slug];
    if(!entry||!validCount(entry.streams))throw Error('Ugyldige data for '+slug+'.');
  }
  return data;
}
function draw(data){
  for(const [slug] of songs){
    const entry=data.tracks[slug];
    inputs.get(slug).value=entry.streams===null?'':String(entry.streams);
    notes.get(slug).textContent=dateLabel(entry.updatedAt);
  }
}
function decode64(encoded){
  const binary=atob(encoded.replace(/\s/g,''));
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function encode64(content){
  const bytes=new TextEncoder().encode(content);
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary);
}
function readForm(){
  const values={};
  for(const [slug,label] of songs){
    const raw=inputs.get(slug).value.trim();
    if(raw!==''&&!/^\d+$/.test(raw))throw Error('Brug kun hele tal for '+label+'.');
    const count=raw===''?null:Number(raw);
    if(!validCount(count))throw Error('Ugyldigt streamtal for '+label+'.');
    values[slug]=count;
  }
  return values;
}
function todayInDenmark(){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
async function load(){
  setBusy(true);setStatus('Henter de aktuelle tal…','info');
  try{
    const response=await fetch(publicData+'?v='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('Kunne ikke hente data fra hjemmesiden. Prøv igen om lidt.');
    const data=validate(await response.json());
    snapshot=data;draw(data);
    setStatus('Tal indlæst. Du kan nu redigere og gemme. Tomt felt betyder, at tallet ikke vises endnu.','ok');
  }catch(err){snapshot=null;setStatus(err.message||'Kunne ikke hente tal.','error');}
  finally{setBusy(false);}
}
function build(){
  for(const [slug,label] of songs){
    const row=document.createElement('div');row.className='song-row';
    const info=document.createElement('div');info.className='song-info';
    const name=document.createElement('label');name.htmlFor='stream-'+slug;name.textContent=label;
    const updated=document.createElement('small');updated.textContent='Endnu ikke opdateret';
    info.append(name,updated);
    const input=document.createElement('input');input.id='stream-'+slug;input.type='text';
    input.inputMode='numeric';input.autocomplete='off';input.spellcheck=false;
    input.placeholder='Ikke angivet';input.setAttribute('aria-label','Streams for '+label);
    row.append(info,input);list.appendChild(row);
    inputs.set(slug,input);notes.set(slug,updated);
  }
}
async function submit(e){
  e.preventDefault();
  if(!snapshot){setStatus('Hent først de aktuelle tal.','error');return;}
  let values;
  try{values=readForm();}catch(err){setStatus(err.message,'error');return;}
  const changed=songs.filter(([slug])=>values[slug]!==snapshot.tracks[slug].streams);
  if(!changed.length){setStatus('Ingen ændringer at gemme.','info');return;}
  const secret=token.value.trim();
  if(!secret){setStatus('Indsæt din GitHub-token for at gemme.','error');token.focus();return;}
  setBusy(true);setStatus('Kontrollerer adgangen og gemmer ændringer…','info');
  try{
    const headers={'Accept':'application/vnd.github+json','Authorization':'Bearer '+secret,'X-GitHub-Api-Version':'2022-11-28'};
    const current=await fetch(api+'?ref=main',{headers,cache:'no-store'});
    if(!current.ok){
      if(current.status===401)throw Error('GitHub-token er ugyldig eller udløbet.');
      if(current.status===403)throw Error('GitHub afviste adgangen. Token skal have Contents: Read and write til dette repository.');
      throw Error('Kunne ikke hente seneste version fra GitHub (HTTP '+current.status+').');
    }
    const file=await current.json();
    const serverData=validate(JSON.parse(decode64(file.content)));
    if(JSON.stringify(serverData.tracks)!==JSON.stringify(snapshot.tracks)){
      throw Error('Tallene er blevet ændret på GitHub siden du åbnede siden. Vent på udgivelsen og tryk "Genindlæs tal", før du gemmer igen.');
    }
    const next={...serverData,tracks:{...serverData.tracks}};
    const date=todayInDenmark();
    for(const [slug] of songs){
      const old=serverData.tracks[slug];
      const newCount=values[slug];
      next.tracks[slug]=newCount===old.streams?old:{...old,streams:newCount,updatedAt:newCount===null?null:date};
    }
    const response=await fetch(api,{
      method:'PUT',
      headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({message:'Update SYNQ Studios stream counts',content:encode64(JSON.stringify(next,null,2)+'\n'),sha:file.sha,branch:'main'})
    });
    if(!response.ok){
      if(response.status===409)throw Error('GitHub registrerede en samtidig ændring. Genindlæs tallene og prøv igen.');
      if(response.status===403)throw Error('Token mangler skriveadgang. Vælg Contents: Read and write.');
      if(response.status===401)throw Error('GitHub-token er ugyldig eller udløbet.');
      throw Error('Kunne ikke gemme hos GitHub (HTTP '+response.status+').');
    }
    snapshot=next;draw(next);
    setStatus('Gemt! '+changed.length+' sang(e) opdateret. De nye tal bliver synlige på hjemmesiden, når GitHub Pages har udgivet ændringen (normalt inden for få minutter).','ok');
  }catch(err){setStatus(err.message||'Der opstod en fejl.','error');}
  finally{setBusy(false);}
}
build();
form.addEventListener('submit',submit);
reload.addEventListener('click',load);
load();
})();
