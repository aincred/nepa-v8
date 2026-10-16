(function(){
 // Ticker pause/play (GIGW: moving content must be pausable)
 var t=document.querySelector('.ticker'),b=t&&t.querySelector('.ticker-btn');
 if(b){b.addEventListener('click',function(){var p=t.classList.toggle('paused');b.textContent=p?'Play':'Pause';b.setAttribute('aria-label',p?'Play announcements':'Pause announcements');});}
 // Cookie consent (DPDP Act 2023): essential always on, others off until consented
 var KEY='nepa-cookie-consent',c=document.getElementById('cookie');if(!c)return;
 var saved=null;try{saved=localStorage.getItem(KEY);}catch(e){}
 if(!saved)c.hidden=false;
 function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}c.hidden=true;}
 c.querySelector('[data-act=accept]').onclick=function(){save({functional:1,analytics:1});};
 c.querySelector('[data-act=reject]').onclick=function(){save({functional:0,analytics:0});};
 var set=c.querySelector('.cset');
 c.querySelector('[data-act=custom]').onclick=function(){set.hidden=!set.hidden;};
 c.querySelector('[data-act=save]').onclick=function(){save({functional:+c.querySelector('#ck-f').checked,analytics:+c.querySelector('#ck-a').checked});};
})();
