// Preview only: "Verified official open source" badge on curated open-source picks, linking straight to the official site.
(function(){
  var OFF={};
  try{ var d=document.querySelectorAll('script[type="application/json"]');
    d.forEach(function(sc){ try{ var a=JSON.parse(sc.textContent); if(Array.isArray(a)) a.forEach(function(r){ if(r&&r.id&&/^cm_pick_/.test(r.id)&&/open source/i.test(r.priceLabel||'')){ var u=r.projectUrl||r.visitUrl; OFF[r.id]=u.split('?')[0]; } }); }catch(e){} }); }catch(e){}
  function tag(){
    document.querySelectorAll('article.card[data-id^="cm_pick_"]').forEach(function(c){
      var id=c.getAttribute('data-id'), u=OFF[id]; if(!u||c.querySelector('.hc-verified')) return;
      var a=document.createElement('a'); a.className='hc-verified'; a.href=u; a.target='_blank'; a.rel='noopener';
      a.innerHTML='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>Verified official open source';
      a.title='Official project site: '+u.replace(/^https?:\/\//,'');
      a.addEventListener('click',function(e){e.stopPropagation();});
      var b=c.querySelector('.card-body'); (b||c).insertBefore(a,(b||c).firstChild);
    });
  }
  tag(); new MutationObserver(tag).observe(document.body,{childList:true,subtree:true});
})();
