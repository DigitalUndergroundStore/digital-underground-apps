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

// v3 (Oct 23): simple filter bar. Search, category chips and sort sit above the grid; "More filters" opens the full popup.
(function(){
  function $(i){return document.getElementById(i);}
  function init(){
    var slot=$('hcSearchSlot'), sw=document.querySelector('#fs-search .search-wrap');
    if(slot&&sw&&!slot.firstChild){ slot.appendChild(sw); var sec=document.querySelector('.fsec[data-sec=search]'); if(sec) sec.style.display='none'; }
    var sort=$('hcSort');
    if(sort&&!sort._b){ sort._b=1; sort.addEventListener('change',function(){ var r=document.querySelector('input[name=sort][value="'+sort.value+'"]'); if(r){ r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); } }); }
    chips();
  }
  function chips(){
    var box=$('hcChips'); if(!box) return;
    var cks=[].slice.call(document.querySelectorAll('input[name=cat]'));
    var html='<button type="button" class="hc-chip" data-c="">All</button>'+cks.map(function(c){ var l=c.parentNode.querySelector('.ck-l'); return '<button type="button" class="hc-chip" data-c="'+c.value.replace(/"/g,'&quot;')+'">'+(l?l.textContent:c.value)+'</button>'; }).join('');
    if(box._h!==html){ box._h=html; box.innerHTML=html; }
    sync();
  }
  function sync(){
    var box=$('hcChips'), any=false;
    if(box){ box.querySelectorAll('.hc-chip').forEach(function(b){ var c=b.getAttribute('data-c'); if(!c) return; var ck=document.querySelector('input[name=cat][value="'+c+'"]'); var on=!!(ck&&ck.checked); if(on) any=true; b.setAttribute('aria-pressed',on); });
    var all=box.querySelector('[data-c=""]'); if(all) all.setAttribute('aria-pressed',!any); }
    var r=document.querySelector('input[name=sort]:checked'), s=$('hcSort'); if(r&&s) s.value=r.value;
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.hc-chip'); if(!b) return;
    var c=b.getAttribute('data-c');
    document.querySelectorAll('input[name=cat]').forEach(function(ck){ var want=!!c&&ck.value===c; if(ck.checked!==want){ ck.checked=want; ck.dispatchEvent(new Event('change',{bubbles:true})); } });
    sync();
  });
  document.addEventListener('change',function(e){ if(e.target&&(e.target.name==='cat'||e.target.name==='sort')) setTimeout(sync,0); });
  function go(){ init(); var cl=$('catList'); if(cl) new MutationObserver(chips).observe(cl,{childList:true}); var fr=$('fReset'); if(fr) fr.addEventListener('click',function(){setTimeout(sync,0);}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();
