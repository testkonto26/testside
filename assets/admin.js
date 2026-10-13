/* SYNQ Studios admin — counts for Apple Music, Spotify and YouTube.
   Credentials are sent only to GitHub and are never persisted. */
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
const platforms=[['am','AM','Apple Music'],['sp','SP','Spotify'],['yt','YT','YouTube']];
const api='https://api.github.com/repos/testkonto26/testside/contents/data/streams.json';
const publicData='../data/streams.json';
const form=document.getElementById('stream-form');
const token=document.getElementById('github-token');
const save=document.getElementById('save');
const reload=document.getElementById('reload');
const status=document.getElementById('status');
const list=document.getElementById('stream-fields');
const inputs=new Map();
const notes=new Map();
const totals=new Map();
const nf=new Intl.NumberFormat('da-DK');
const df=new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Copenhagen'});
let snapshot=null;
function setStatus(message,kind){
 status.textContent=message;status.dataset.kind=kind||'info';
}
function setBusy(value){
 save.disabled=value||!snapshot;
 reload.disabled=value;
 for(const input of inputs.values())input.disabled=value;
 save.textContent=value?'Gemmer…':'Gem ændringer';
}
function validCount(v){return v===null||(Number.isSafeInteger(v)&&v>=0);}
function totalOf(entry){
 const values=platforms.map(([key])=>entry[key]);
 if(values.some(v=>!validCount(v)))throw Error('Ugyldigt streamtal i datafilen.');
 if(values.every(v=>v===null))return null;
 const total=values.reduce((sum,v)=>sum+(v===null?0:v),0);
 if(!Number.isSafeInteger(total))throw Error('Det samlede antal streams er for højt.');
 return total;
}
function validate(data){
 if(!data||data.version!==2||!data.tracks||typeof data.tracks!=='object')
  throw Error('Datafilen har et uventet format. Genindlæs siden.');
 for(const [slug] of songs){
  const entry=data.tracks[slug];
  if(!entry||typeof entry!=='object')throw Error('Manglende data for '+slug+'.');
  totalOf(entry);
 }
 return data;
}
function dateLabel(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'Endnu ikke opdateret';
 return 'Senest opdateret '+df.format(new Date(value+'T12:00:00Z'));
}
function draw(data){
 for(const [slug] of songs){
  const entry=data.tracks[slug];
  for(const [key] of platforms)inputs.get(slug+'-'+key).value=entry[key]===null?'':String(entry[key]);
  notes.get(slug).textContent=dateLabel(entry.updatedAt);
  totals.get(slug).textContent=totalOf(entry)===null?'Total: —':'Total: '+nf.format(totalOf(entry))+' streams';
 }
}
function readForm(){
 const values={};
 for(const [slug,label] of songs){
  const entry={};
  for(const [key,short,long] of platforms){
   const raw=inputs.get(slug+'-'+key).value.trim();
   if(raw!==''&&!/^\d+$/.test(raw))throw Error('Brug kun hele tal i '+short+' for '+label+'.');
   const count=raw===''?null:Number(raw);
   if(!validCount(count))throw Error('Ugyldigt antal i '+long+' for '+label+'.');
   entry[key]=count;
  }
  totalOf(entry);
  values[slug]=entry;
 }
 return values;
}
function updateLiveTotal(slug){
 try{
  const entry={};
  for(const [key] of platforms){
   const raw=inputs.get(slug+'-'+key).value.trim();
   if(raw!==''&&!/^\d+$/.test(raw))throw Error('Ugyldigt tal');
   entry[key]=raw===''?null:Number(raw);
  }
  const total=totalOf(entry);
  totals.get(slug).textContent=total===null?'Total: —':'Total: '+nf.format(total)+' streams';
 }catch(err){totals.get(slug).textContent='Total: ugyldigt tal';}
}
function decode64(encoded){
 const bytes=Uint8Array.from(atob(encoded.replace(/\s/g,'')),c=>c.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}
function encode64(content){
 let binary='';
 for(const byte of new TextEncoder().encode(content))binary+=String.fromCharCode(byte);
 return btoa(binary);
}
function todayInDenmark(){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function build(){
 for(const [slug,label] of songs){
  const row=document.createElement('div');row.className='song-row';
  const info=document.createElement('div');info.className='song-info';
  const name=document.createElement('strong');name.className='song-name';name.textContent=label;
  const updated=document.createElement('small');updated.textContent='Endnu ikke opdateret';
  const total=document.createElement('span');total.className='song-total';total.textContent='Total: —';
  info.append(name,updated,total);
  const fields=document.createElement('div');fields.className='song-inputs';
  for(const [key,short,long] of platforms){
   const wrapper=document.createElement('label');wrapper.className='platform-field';
   const caption=document.createElement('span');caption.className='platform-label';caption.textContent=short;
   const input=document.createElement('input');input.type='text';input.inputMode='numeric';
   input.autocomplete='off';input.spellcheck=false;input.placeholder='0';
   input.setAttribute('aria-label',long+' streams for '+label);
   input.addEventListener('input',function(){updateLiveTotal(slug);});
   wrapper.append(caption,input);fields.appendChild(wrapper);
   inputs.set(slug+'-'+key,input);
  }
  row.append(info,fields);list.appendChild(row);
  notes.set(slug,updated);totals.set(slug,total);
 }
}
async function load(){
 setBusy(true);setStatus('Henter de aktuelle tal…','info');
 try{
  const response=await fetch(publicData+'?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('Kunne ikke hente data fra hjemmesiden. Prøv igen om lidt.');
  const data=validate(await response.json());
  snapshot=data;draw(data);
  setStatus('Tal indlæst. AM, SP og YT lægges automatisk sammen for hver sang. Tomme felter tælles som 0.','ok');
 }catch(err){snapshot=null;setStatus(err.message||'Kunne ikke hente tal.','error');}
 finally{setBusy(false);}
}
async function submit(e){
 e.preventDefault();
 if(!snapshot){setStatus('Hent først de aktuelle tal.','error');return;}
 let values;
 try{values=readForm();}catch(err){setStatus(err.message,'error');return;}
 const changed=songs.filter(([slug])=>platforms.some(([key])=>values[slug][key]!==snapshot.tracks[slug][key]));
 if(!changed.length){setStatus('Ingen ændringer at gemme.','info');return;}
 const secret=token.value.trim();
 if(!secret){setStatus('Indsæt din GitHub-token for at gemme.','error');token.focus();return;}
 setBusy(true);setStatus('Kontrollerer adgangen og gemmer ændringer…','info');
 try{
  const headers={'Accept':'application/vnd.github+json','Authorization':'Bearer '+secret,'X-GitHub-Api-Version':'2022-11-28'};
  const current=await fetch(api+'?ref=main',{headers,cache:'no-store'});
  if(!current.ok){
   if(current.status===401)throw Error('GitHub-token er ugyldig eller udløbet.');
   if(current.status===403)throw Error('GitHub afviste adgangen. Token skal have Contents: Read and write.');
   throw Error('Kunne ikke hente seneste version fra GitHub (HTTP '+current.status+').');
  }
  const file=await current.json();
  const serverData=validate(JSON.parse(decode64(file.content)));
  if(JSON.stringify(serverData.tracks)!==JSON.stringify(snapshot.tracks)){
   throw Error('Tallene er ændret på GitHub siden du åbnede siden. Vent på udgivelsen og tryk "Genindlæs tal" før du gemmer igen.');
  }
  const next={...serverData,tracks:{...serverData.tracks}};
  const date=todayInDenmark();
  for(const [slug] of songs){
   const old=serverData.tracks[slug];
   const entry=values[slug];
   const isChanged=platforms.some(([key])=>entry[key]!==old[key]);
   next.tracks[slug]=isChanged
    ?{...old,...entry,updatedAt:totalOf(entry)===null?null:date}
    :old;
  }
  const response=await fetch(api,{
   method:'PUT',
   headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify({message:'Update SYNQ Studios AM SP YT stream counts',content:encode64(JSON.stringify(next,null,2)+'\n'),sha:file.sha,branch:'main'})
  });
  if(!response.ok){
   if(response.status===409)throw Error('En anden ændring blev gemt samtidig. Genindlæs tallene og prøv igen.');
   if(response.status===403)throw Error('Token mangler skriveadgang. Vælg Contents: Read and write.');
   if(response.status===401)throw Error('GitHub-token er ugyldig eller udløbet.');
   throw Error('Kunne ikke gemme hos GitHub (HTTP '+response.status+').');
  }
  snapshot=next;draw(next);
  setStatus('Gemt! '+changed.length+' sang(e) opdateret. De nye totaler bliver synlige, når GitHub Pages har udgivet ændringen.','ok');
 }catch(err){setStatus(err.message||'Der opstod en fejl.','error');}
 finally{setBusy(false);}
}
build();
form.addEventListener('submit',submit);
reload.addEventListener('click',load);
load();
})();
