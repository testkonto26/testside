const logoCss=document.createElement('link');logoCss.rel='stylesheet';logoCss.href='logo.css?v=20260919';document.head.appendChild(logoCss);
const menuBtn=document.querySelector('.menu-btn');const mobileNav=document.querySelector('.mobile-nav');if(menuBtn&&mobileNav){menuBtn.addEventListener('click',()=>mobileNav.classList.toggle('open'));mobileNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>mobileNav.classList.remove('open')))}
const cookie=document.querySelector('.cookie');if(cookie&&localStorage.getItem('hey-cookie-choice'))cookie.style.display='none';document.querySelectorAll('[data-cookie]').forEach(button=>button.addEventListener('click',()=>{localStorage.setItem('hey-cookie-choice',button.dataset.cookie);if(cookie)cookie.style.display='none'}));
const track=document.querySelector('.projects-track');const dots=[...document.querySelectorAll('.dot')];let slideIndex=0;let autoSlide;
function getSlideStep(){const card=track?.querySelector('.project-card');return card?card.getBoundingClientRect().width+16:0}
function updateDots(){dots.forEach((dot,index)=>dot.classList.toggle('active',index===Math.min(slideIndex,dots.length-1)))}
function syncSlideIndex(){const step=getSlideStep();if(!track||!step)return;slideIndex=Math.round(track.scrollLeft/step);updateDots()}
function move(direction=1){if(!track)return;const step=getSlideStep();if(!step)return;const visible=innerWidth<=860?1:3;const max=Math.max(0,track.children.length-visible);slideIndex=Math.max(0,Math.min(max,slideIndex+direction));track.scrollTo({left:step*slideIndex,behavior:'smooth'});updateDots()}
function stopAutoSlide(){if(autoSlide)clearInterval(autoSlide)}
document.querySelector('.slider-btn.next')?.addEventListener('click',()=>move(1));document.querySelector('.slider-btn.prev')?.addEventListener('click',()=>move(-1));
if(track){let scrollTimer;track.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(syncSlideIndex,80)},{passive:true});track.addEventListener('pointerdown',stopAutoSlide,{passive:true});track.addEventListener('touchstart',stopAutoSlide,{passive:true});autoSlide=setInterval(()=>{const visible=innerWidth<=860?1:3;const max=Math.max(0,track.children.length-visible);if(max<1)return;if(slideIndex>=max)slideIndex=-1;move(1)},4500)}
const projectImages=[...document.querySelectorAll('.project-card img')];
if(projectImages.length){
  const lightbox=document.createElement('div');
  lightbox.className='lightbox';
  lightbox.setAttribute('aria-hidden','true');
  lightbox.innerHTML='<div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="Projektbillede"><button class="lightbox-close" type="button" aria-label="Luk">&times;</button><button class="lightbox-nav lightbox-prev" type="button" aria-label="Forrige billede">&lsaquo;</button><img class="lightbox-image" alt=""><button class="lightbox-nav lightbox-next" type="button" aria-label="Næste billede">&rsaquo;</button><div class="lightbox-caption"><strong></strong><span></span></div></div>';
  document.body.appendChild(lightbox);
  const image=lightbox.querySelector('.lightbox-image');
  const title=lightbox.querySelector('.lightbox-caption strong');
  const meta=lightbox.querySelector('.lightbox-caption span');
  let current=0;
  let touchStart=0;
  const show=index=>{current=(index+projectImages.length)%projectImages.length;const source=projectImages[current];const card=source.closest('.project-card');image.src=source.currentSrc||source.src;image.alt=source.alt;title.textContent=card?.querySelector('h3')?.textContent||source.alt;meta.textContent=card?.querySelector('p')?.textContent||''};
  const open=index=>{show(index);lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open');lightbox.querySelector('.lightbox-close').focus()};
  const close=()=>{lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open')};
  projectImages.forEach((item,index)=>item.addEventListener('click',event=>{event.preventDefault();open(index)}));
  lightbox.querySelector('.lightbox-close').addEventListener('click',close);
  lightbox.querySelector('.lightbox-prev').addEventListener('click',()=>show(current-1));
  lightbox.querySelector('.lightbox-next').addEventListener('click',()=>show(current+1));
  lightbox.addEventListener('click',event=>{if(event.target===lightbox)close()});
  lightbox.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX},{passive:true});
  lightbox.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>55)show(current+(distance<0?1:-1))},{passive:true});
  document.addEventListener('keydown',event=>{if(!lightbox.classList.contains('open'))return;if(event.key==='Escape')close();if(event.key==='ArrowLeft')show(current-1);if(event.key==='ArrowRight')show(current+1)});
}
