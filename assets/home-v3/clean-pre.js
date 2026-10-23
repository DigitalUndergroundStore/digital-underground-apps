// Home: creators-only marketplace (Wolf, Oct 23 2026). Drops curated open-source picks (cm_pick_*) from every listings source before home.js reads them.
(function(){
  function isPick(r){ return r && (/^cm_pick_/.test(r.id||'') || r.curated===true); }
  function strip(d){ if(Array.isArray(d)) return d.filter(function(r){return !isPick(r);}); if(d&&Array.isArray(d.listings)){ d.listings=d.listings.filter(function(r){return !isPick(r);}); } return d; }
  var of=window.fetch; if(!of) return;
  window.fetch=function(u,o){ var s=String(u&&u.url||u);
    if(!/\/community\/listings\.json|\/api\/community\/listings(\?|$)|\/community\/pinned\.json/.test(s)) return of.apply(this,arguments);
    return of.apply(this,arguments).then(function(r){ if(!r.ok) return r; return r.clone().json().then(function(d){ return new Response(JSON.stringify(strip(d)),{status:200,headers:{'content-type':'application/json'}}); }).catch(function(){return r;}); });
  };
})();
