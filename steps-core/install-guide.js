/* biiwow "save as an app" guide, shared by every biiwow language app and the Languages page.
   On first open (not when already running as an installed app) a sheet asks which system the
   visitor uses (Android, iPhone/iPad, computer) and shows the steps for it, or lets them skip.
   The answer is remembered on the device. window.biiwowInstall() opens it again at any time. */
(function(){
  var KEY="biiwow.install.v1";
  var standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  var deferred=null;
  addEventListener("beforeinstallprompt",function(e){e.preventDefault();deferred=e;var b=document.getElementById("bwi-native");if(b)b.hidden=false;});
  addEventListener("appinstalled",function(){save("installed");close();});
  function load(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
  function save(v){try{localStorage.setItem(KEY,v);}catch(e){}}
  function detect(){var u=navigator.userAgent||"";
    if(/android/i.test(u))return"android";
    if(/iphone|ipad|ipod/i.test(u)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1))return"ios";
    return"desktop";}
  function uiLang(){var l=(document.documentElement.lang||"").toLowerCase();return l.indexOf("ru")===0?"ru":"en";}
  function appName(){return window.BW_APP_NAME||(window.STEPS&&window.STEPS.appName)||"biiwow";}
  var T={
    en:{title:"Save {app} as an app",sub:"It opens from your home screen or desktop like a normal app, full screen, and the levels you have opened work offline.",
        which:"Which device are you using?",android:"Android",ios:"iPhone / iPad",desktop:"Computer",yours:"this device",skip:"Skip",back:"Back",done:"Done",
        install:"Install now",later:"You can always open this guide again from the Languages page.",
        steps:{
          android:["Open the menu <b>⋮</b> at the top right of Chrome.","Tap <b>Add to Home screen</b> or <b>Install app</b>.","Tap <b>Install</b>. The biiwow icon appears on your home screen."],
          androidNote:"Samsung Internet: menu <b>≡</b> → <b>Add page to</b> → <b>Home screen</b>.",
          ios:["Open this page in <b>Safari</b>.","Tap the <b>Share</b> button {share} (bottom of the screen on iPhone, top right on iPad).","Scroll down and tap <b>Add to Home Screen</b>.","Tap <b>Add</b>. The biiwow icon appears on your home screen."],
          iosNote:"In Chrome on iPhone, the Share button is on the right of the address bar.",
          desktop:["<b>Chrome or Edge:</b> click the install icon {inst} at the right of the address bar, then <b>Install</b>.","No icon? Chrome: menu <b>⋮</b> → <b>Cast, save and share</b> → <b>Install page as app</b>. Edge: menu <b>···</b> → <b>Apps</b> → <b>Install this site as an app</b>.","<b>Safari on Mac:</b> menu <b>File</b> → <b>Add to Dock</b>."],
          desktopNote:"Firefox cannot install apps: press Ctrl+D (Cmd+D on Mac) to bookmark the page instead."}},
    ru:{title:"Установите {app} как приложение",sub:"Оно будет открываться с главного экрана или рабочего стола как обычное приложение, на весь экран, а открытые уровни будут работать без интернета.",
        which:"Какое у вас устройство?",android:"Android",ios:"iPhone / iPad",desktop:"Компьютер",yours:"это устройство",skip:"Пропустить",back:"Назад",done:"Готово",
        install:"Установить",later:"Эту инструкцию всегда можно открыть снова на странице Languages.",
        steps:{
          android:["Откройте меню <b>⋮</b> в правом верхнем углу Chrome.","Нажмите <b>Добавить на главный экран</b> или <b>Установить приложение</b>.","Нажмите <b>Установить</b>. Значок biiwow появится на главном экране."],
          androidNote:"Samsung Internet: меню <b>≡</b> → <b>Добавить страницу на</b> → <b>Главный экран</b>.",
          ios:["Откройте эту страницу в <b>Safari</b>.","Нажмите кнопку <b>Поделиться</b> {share} (внизу экрана на iPhone, справа вверху на iPad).","Прокрутите вниз и выберите <b>На экран «Домой»</b>.","Нажмите <b>Добавить</b>. Значок biiwow появится на главном экране."],
          iosNote:"В Chrome на iPhone кнопка «Поделиться» находится справа в адресной строке.",
          desktop:["<b>Chrome или Edge:</b> нажмите значок установки {inst} справа в адресной строке, затем <b>Установить</b>.","Значка нет? Chrome: меню <b>⋮</b> → <b>Трансляция, сохранение и отправка</b> → <b>Установить страницу как приложение</b>. Edge: меню <b>···</b> → <b>Приложения</b> → <b>Установить этот сайт как приложение</b>.","<b>Safari на Mac:</b> меню <b>Файл</b> → <b>Добавить в Dock</b>."],
          desktopNote:"Firefox не устанавливает приложения: нажмите Ctrl+D (Cmd+D на Mac), чтобы добавить страницу в закладки."}}};
  var ICON={
    android:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    ios:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 4.5h4"/></svg>',
    desktop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/></svg>',
    share:'<svg class="bwi-inl" viewBox="0 0 24 24" aria-label="Share"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>',
    inst:'<svg class="bwi-inl" viewBox="0 0 24 24" aria-label="Install"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M12 7v6M9 10l3 3 3-3"/></svg>'};
  var css='#bwi{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,16,12,.45);font-family:Nunito,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}'
   +'#bwi .bwi-card{--a:#fa712d;--bg:#fffdf9;--fg:#2a2420;--mu:#6f655c;--ln:#ece3d8;--soft:#fff1e8;background:var(--bg);color:var(--fg);width:100%;max-width:440px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:22px 20px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 40px rgba(0,0,0,.18);animation:bwiUp .25s ease-out}'
   +'#bwi .bwi-card:focus{outline:none}#bwi button:focus-visible{outline:2px solid var(--a);outline-offset:2px}'
   +'@media (min-width:600px){#bwi{align-items:center}#bwi .bwi-card{border-radius:22px;padding-bottom:20px}}'
   +'@media (prefers-color-scheme:dark){#bwi .bwi-card{--a:#fb8a4a;--bg:#1f1d22;--fg:#f3eee8;--mu:#a8a19a;--ln:#34313a;--soft:#2c2420}}'
   +'@keyframes bwiUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}'
   +'#bwi .bwi-top{display:flex;gap:12px;align-items:center;margin-bottom:6px}#bwi .bwi-top img{width:48px;height:48px;border-radius:12px;flex:none}'
   +'#bwi h2{font-size:1.2rem;line-height:1.25;margin:0;font-weight:800}#bwi p{margin:6px 0;color:var(--mu);font-size:.95rem;line-height:1.45}'
   +'#bwi .bwi-q{color:var(--fg);font-weight:700;margin:14px 0 8px}#bwi .bwi-opts{display:grid;gap:8px}'
   +'#bwi button{font:inherit;cursor:pointer}#bwi .bwi-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;border:1.5px solid var(--ln);border-radius:14px;background:transparent;color:var(--fg);font-weight:700;font-size:1rem}'
   +'#bwi .bwi-opt:hover,#bwi .bwi-opt:focus-visible{border-color:var(--a);outline:none}#bwi .bwi-opt.mine{border-color:var(--a);background:var(--soft)}'
   +'#bwi .bwi-opt small{margin-left:auto;font-weight:700;font-size:.75rem;color:var(--a);text-transform:uppercase;letter-spacing:.03em}'
   +'#bwi svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}#bwi .bwi-opt svg{color:var(--a)}'
   +'#bwi svg.bwi-inl{width:1.15em;height:1.15em;vertical-align:-.2em;color:var(--a)}'
   +'#bwi ol{margin:12px 0 4px;padding:0;list-style:none;counter-reset:s}#bwi li{counter-increment:s;position:relative;padding:4px 0 10px 38px;line-height:1.45}'
   +'#bwi li:before{content:counter(s);position:absolute;left:0;top:2px;width:26px;height:26px;border-radius:50%;background:var(--a);color:#fff;font-weight:800;font-size:.85rem;display:flex;align-items:center;justify-content:center}'
   +'#bwi .bwi-note{font-size:.85rem;background:var(--soft);border-radius:12px;padding:10px 12px;margin-top:6px}'
   +'#bwi .bwi-row{display:flex;gap:8px;margin-top:16px;align-items:center}#bwi .bwi-main{flex:1;padding:12px 16px;border:0;border-radius:999px;background:var(--a);color:#fff;font-weight:800;font-size:1rem}'
   +'#bwi .bwi-ghost{padding:12px 14px;border:0;background:transparent;color:var(--mu);font-weight:700}'
   +'#bwi .bwi-lang{margin-left:auto;align-self:flex-start;border:1px solid var(--ln);background:transparent;color:var(--mu);border-radius:999px;padding:3px 10px;font-size:.8rem;font-weight:800}'
   +'#bwi .bwi-later{font-size:.8rem;text-align:center;margin-top:10px}';
  var lang,root;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function close(){if(root){root.remove();root=null;}removeEventListener("keydown",onKey);}
  function onKey(e){if(e.key==="Escape"){save("skipped");close();}}
  function frame(inner){
    var t=T[lang];
    root.innerHTML='<div class="bwi-card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="bwi-h">'
      +'<div class="bwi-top"><img src="icons/icon-192.png" alt=""><h2 id="bwi-h">'+esc(t.title.replace("{app}",appName()))+'</h2>'
      +'<button class="bwi-lang" data-act="lang" aria-label="Language">'+(lang==="ru"?"EN":"RU")+'</button></div>'+inner+'</div>';
    setTimeout(function(){var c=root&&root.querySelector(".bwi-card");if(c)c.focus({preventScroll:true});},30);
  }
  function choose(){
    var t=T[lang],mine=detect();
    var opts=["android","ios","desktop"].map(function(k){return'<button class="bwi-opt'+(k===mine?' mine':'')+'" data-os="'+k+'">'+ICON[k]+'<span>'+t[k]+'</span>'+(k===mine?'<small>'+t.yours+'</small>':'')+'</button>';}).join("");
    frame('<p>'+esc(t.sub)+'</p><p class="bwi-q">'+esc(t.which)+'</p><div class="bwi-opts">'+opts+'</div>'
      +'<div class="bwi-row"><button class="bwi-ghost" data-act="skip">'+esc(t.skip)+'</button></div>');
  }
  function steps(os){
    var t=T[lang],s=t.steps;
    var li=s[os].map(function(x){return"<li>"+x.replace("{share}",ICON.share).replace("{inst}",ICON.inst)+"</li>";}).join("");
    var native=(os==="android"||os==="desktop")?'<button class="bwi-main" id="bwi-native" data-act="native"'+(deferred?'':' hidden')+'>'+esc(t.install)+'</button>':'';
    frame('<ol>'+li+'</ol><p class="bwi-note">'+s[os+"Note"]+'</p>'
      +'<div class="bwi-row"><button class="bwi-ghost" data-act="back">'+esc(t.back)+'</button>'+native
      +'<button class="'+(native&&deferred?'bwi-ghost':'bwi-main')+'" data-act="done">'+esc(t.done)+'</button></div>'
      +'<p class="bwi-later">'+esc(t.later)+'</p>');
    root.dataset.os=os;
  }
  function open(force){
    if(root)return;if(!force&&(standalone||load()))return;
    if(!document.getElementById("bwi-css")){var st=document.createElement("style");st.id="bwi-css";st.textContent=css;document.head.appendChild(st);}
    lang=uiLang();root=document.createElement("div");root.id="bwi";document.body.appendChild(root);
    root.addEventListener("click",function(e){
      if(e.target===root){save("skipped");close();return;}
      var b=e.target.closest("button");if(!b)return;
      if(b.dataset.os){steps(b.dataset.os);return;}
      var a=b.dataset.act;
      if(a==="skip"){save("skipped");close();}
      else if(a==="done"){save("shown");close();}
      else if(a==="back")choose();
      else if(a==="lang"){lang=lang==="ru"?"en":"ru";if(root.dataset.os)steps(root.dataset.os);else choose();}
      else if(a==="native"&&deferred){deferred.prompt();deferred.userChoice.then(function(r){if(r&&r.outcome==="accepted"){save("installed");close();}deferred=null;});}
    });
    addEventListener("keydown",onKey);choose();
  }
  window.biiwowInstall=function(){open(true);};
  function start(){setTimeout(function(){open(false);},1500);}
  if(document.readyState==="complete")start();else addEventListener("load",start);
})();
