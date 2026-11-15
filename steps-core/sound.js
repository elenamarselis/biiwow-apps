/* biiwow sound switch, shared by every language app: a 🔊/🔇 button in the top bar that turns all speech off or on.
   It wraps the app's Voice.speak, so every game, test, flashcard and speaker button respects it. Saved per app and device. */
(function(){
  if(typeof Voice==="undefined"||!Voice.speak)return;
  var app=(typeof LANG!=="undefined"&&LANG.code)||"ns",KEY="biiwow.sound."+app;
  function muted(){try{return localStorage.getItem(KEY)==="off";}catch(e){return false;}}
  function ru(){return (document.documentElement.lang||"").toLowerCase().indexOf("ru")===0;}
  var lastTap=0,lastTapSpeaker=false;
  document.addEventListener("click",function(e){lastTap=Date.now();var t=e.target;lastTapSpeaker=!!(t&&t.closest&&t.closest(".spk,.say,[data-say]"));},true);
  var speak=Voice.speak;
  Voice.speak=function(){if(muted()){if(lastTapSpeaker&&Date.now()-lastTap<600){note(ru()?"Звук выключен — нажмите 🔇 вверху, чтобы включить":"Sound is off — tap 🔇 at the top to turn it on");lastTapSpeaker=false;}return;}return speak.apply(Voice,arguments);};
  function note(msg){if(typeof toast==="function"){toast(msg,2500);return;}var d=document.createElement("div");d.textContent=msg;d.style.cssText="position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#2a2420;color:#fff;padding:10px 14px;border-radius:12px;z-index:99999;font:600 14px Nunito,system-ui,sans-serif";document.body.appendChild(d);setTimeout(function(){d.remove();},2500);}
  var btn=document.createElement("button");btn.id="bw-sound";btn.type="button";btn.className="pill";btn.style.cssText="cursor:pointer;border:0;font:inherit;min-width:2.4em;justify-content:center";
  function draw(){var m=muted();btn.textContent=m?"🔇":"🔊";var lab=m?(ru()?"Звук выключен — включить":"Sound off — turn on"):(ru()?"Звук включён — выключить":"Sound on — turn off");btn.title=lab;btn.setAttribute("aria-label",lab);btn.setAttribute("aria-pressed",m?"true":"false");}
  btn.addEventListener("click",function(e){e.stopPropagation();var m=!muted();try{localStorage.setItem(KEY,m?"off":"on");}catch(err){}if(m){try{speechSynthesis.cancel();}catch(err){}}draw();note(m?(ru()?"Звук выключен":"Sound off"):(ru()?"Звук включён":"Sound on"));});
  function place(){if(document.getElementById("bw-sound")){draw();return;}var host=document.querySelector(".hdr-right")||document.querySelector("header .pts");var anchor=document.getElementById("langsw");if(!host)return;if(anchor&&anchor.parentNode===host)host.insertBefore(btn,anchor);else host.appendChild(btn);draw();}
  place();new MutationObserver(function(){place();}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  setInterval(place,2000);
})();
