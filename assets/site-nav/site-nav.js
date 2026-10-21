(function(){var b=document.getElementById('dunMenu'),d=document.getElementById('dunDrawer');if(!b||!d)return;
b.addEventListener('click',function(){var o=d.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Close menu':'Open menu')});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&d.classList.contains('open')){d.classList.remove('open');b.setAttribute('aria-expanded','false');b.focus()}})})();
