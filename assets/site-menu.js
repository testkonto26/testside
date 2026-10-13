/* Native details works without JavaScript; enhance dismissal. */
document.querySelectorAll('.site-menu').forEach(function(menu){
document.addEventListener('pointerdown',function(e){if(menu.open&&!menu.contains(e.target))menu.open=false;});
menu.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
menu.querySelectorAll('.site-menu-panel a').forEach(function(a){a.addEventListener('click',function(){menu.open=false;});});
});
