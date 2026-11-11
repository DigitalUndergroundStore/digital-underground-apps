(function(){if(window.__duBug)return;window.__duBug=1;
var ver="";var a=document.querySelector("[data-app-version]");if(a)ver=a.getAttribute("data-app-version");
fetch("/planetview/version.json",{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){ver=j.version||j.v||ver}).catch(function(){});
var css="#dubug-btn{position:fixed;left:12px;bottom:12px;z-index:2147483000;background:#070b0f;color:#cfd8e3;border:1px solid #2a3540;border-radius:18px;padding:7px 12px;font:13px system-ui,sans-serif;cursor:pointer;opacity:.85}#dubug-btn:hover{opacity:1;border-color:#6aa9ff}#dubug-p{position:fixed;left:12px;bottom:52px;z-index:2147483001;width:min(340px,calc(100vw - 24px));background:#070b0f;color:#cfd8e3;border:1px solid #2a3540;border-radius:10px;padding:14px;font:14px system-ui,sans-serif;box-shadow:0 8px 30px #000a;display:none}#dubug-p textarea,#dubug-p input,#dubug-p select{width:100%;box-sizing:border-box;margin:6px 0;background:#0e151c;color:#e6edf3;border:1px solid #2a3540;border-radius:6px;padding:7px;font:inherit}#dubug-p small{color:#8b98a5}#dubug-p button{background:#2f6fd6;color:#fff;border:0;border-radius:6px;padding:8px 12px;font:inherit;cursor:pointer}#dubug-x{float:right;background:none!important;color:#8b98a5!important;padding:0 4px!important}";
var s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
var b=document.createElement("button");b.id="dubug-btn";b.type="button";b.textContent="\uD83D\uDC1E Report a bug";b.title="PlanetView Live is in live beta \u2014 report bugs";
var p=document.createElement("div");p.id="dubug-p";p.setAttribute("role","dialog");p.setAttribute("aria-label","Report a bug");
p.innerHTML='<button id="dubug-x" type="button" aria-label="Close">\u2715</button><b>Live beta \u2014 report a bug</b><br><small>Tell us what broke and what you were doing. Every report is read.</small><form id="dubug-f"><select name="type"><option value="bug">Bug</option><option value="feature">Feature request</option><option value="other">Other</option></select><textarea name="message" rows="4" required maxlength="4000" placeholder="What happened? What did you expect?"></textarea><input name="email" type="email" placeholder="Email (optional, for a reply)"><input name="website" tabindex="-1" autocomplete="off" style="display:none"><button type="submit">Send bug report</button> <small id="dubug-s" aria-live="polite"></small></form>';
function add(){document.body.appendChild(b);document.body.appendChild(p)}
if(document.body)add();else document.addEventListener("DOMContentLoaded",add);
b.onclick=function(){p.style.display=p.style.display=="block"?"none":"block"};
p.addEventListener("click",function(e){if(e.target.id=="dubug-x")p.style.display="none"});
p.addEventListener("keydown",function(e){e.stopPropagation()});p.addEventListener("keyup",function(e){e.stopPropagation()});
p.addEventListener("submit",function(e){e.preventDefault();var f=e.target,st=p.querySelector("#dubug-s"),btn=f.querySelector("button");
if(!f.message.value.trim()){st.textContent="Please describe the bug.";return}
btn.disabled=true;st.textContent="Sending\u2026";
fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:"PlanetView Live",source:"planetview-beta",type:f.type.value,message:f.message.value+"\n\n[UA] "+navigator.userAgent+" | "+innerWidth+"x"+innerHeight,email:f.email.value,page:location.href,version:ver,website:f.website.value})})
.then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok||j.ok===false)throw new Error(j.error||"Send failed");})})
.then(function(){st.textContent="Thanks \u2014 sent!";f.message.value=""}).catch(function(err){st.textContent=err.message+" Try again shortly."}).finally(function(){btn.disabled=false})});
})();
