
/* ---------- my words: learned / needs practice / not covered yet, per level ---------- */
Object.assign(T.en,{mwTitle:"My words",mwIntro:"Every word you answer is tracked. Learned = answered correctly at least twice with 70% or more right.",mwLearned:"Learned",mwPractice:"Needs practice",mwNew:"Not covered yet",
  mwOpen:"Open my words",mwPractiseThese:n=>`Practise these (${Math.min(n,20)})`,mwStartNew:n=>`Start learning (${Math.min(n,20)})`,mwEmpty:"Nothing here yet.",mwStat:(c,w)=>`✓ ${c} · ✗ ${w}`,mwMore:n=>`and ${n} more…`,mwSearch:"Search…",mwLevelLine:(l,p,n)=>`${l} learned · ${p} in practice · ${n} not covered`});
Object.assign(T.ru,{mwTitle:"Мои слова",mwIntro:"Каждый ваш ответ учитывается. Выучено — слово отвечено правильно минимум дважды и верно в 70% случаев или чаще.",mwLearned:"Выучено",mwPractice:"Нужно повторить",mwNew:"Ещё не пройдено",
  mwOpen:"Открыть мои слова",mwPractiseThese:n=>`Повторить их (${Math.min(n,20)})`,mwStartNew:n=>`Начать учить (${Math.min(n,20)})`,mwEmpty:"Здесь пока пусто.",mwStat:(c,w)=>`✓ ${c} · ✗ ${w}`,mwMore:n=>`и ещё ${n}…`,mwSearch:"Поиск…",mwLevelLine:(l,p,n)=>`выучено ${l} · повторить ${p} · не пройдено ${n}`});
const mwGroup=w=>{const s=wstat(w);if(!s||!((s.correct||0)+(s.wrong||0)))return "new";return mastered(w)?"learned":"practice";};
function mwBar(c){const tot=c.learned+c.practice+c.new||1;return el("div",{style:"display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--line);flex:1"},el("i",{style:"width:"+(c.learned/tot*100)+"%;background:var(--good)"}),el("i",{style:"width:"+(c.practice/tot*100)+"%;background:var(--gold)"}));}
async function mwSummary(box){box.innerHTML="";box.append(el("span",{class:"muted small"},t("loading")));const vs=await Promise.all(LEVELS.map(vocabFor));box.innerHTML="";
  LEVELS.forEach((L,i)=>{const v=vs[i];if(!v)return;const c={learned:0,practice:0,new:0};for(const w of v)c[mwGroup(w)]++;
    box.append(el("button",{class:"game",style:"cursor:pointer;text-align:left",onclick:()=>{S.level=L;touch();go("mywords");}},el("div",{class:"row",style:"gap:10px;align-items:center"},el("span",{class:"tag"},L),mwBar(c)),el("span",{class:"small muted"},t("mwLevelLine",c.learned,c.practice,c.new))));});}
async function viewMyWords(w){const L=S.level;const tab=S.mwTab=S.mwTab||"practice";
  w.append(el("div",{},el("p",{class:"eyebrow"},t("levelWord")+" "+L),el("h1",{},t("mwTitle")),el("p",{class:"muted"},t("mwIntro"))));
  const box=el("div",{class:"stack"},el("span",{class:"muted small"},t("loading")));w.append(box);const v=await vocabFor(L);if(S.view!=="mywords")return;box.innerHTML="";if(!v){box.append(el("div",{class:"card"},t("noVocab")));return;}
  const groups={learned:[],practice:[],new:[]};for(const x of v)groups[mwGroup(x)].push(x);
  groups.practice.sort((a,b)=>((wstat(b)||{}).wrong||0)-((wstat(a)||{}).wrong||0));
  box.append(el("div",{class:"row",style:"gap:10px;align-items:center"},mwBar({learned:groups.learned.length,practice:groups.practice.length,new:groups.new.length})));
  const tabs=el("div",{class:"row",style:"gap:8px;flex-wrap:wrap"});const list=el("div",{class:"stack",style:"gap:6px"});const q=el("input",{type:"search",placeholder:t("mwSearch"),style:"max-width:280px"});
  const lab={learned:"mwLearned",practice:"mwPractice",new:"mwNew"},col={learned:"good",practice:"gold",new:""};
  const draw=()=>{tabs.innerHTML="";for(const k of["practice","learned","new"])tabs.append(el("button",{class:"btn"+(S.mwTab===k?" primary":""),onclick:()=>{S.mwTab=k;draw();}},t(lab[k])+" · "+groups[k].length));
    list.innerHTML="";const qq=norm(q.value);const items=groups[S.mwTab].filter(x=>!qq||norm(x.en).includes(qq)||norm(TR(x)).includes(qq));
    if(S.mwTab!=="learned"&&items.length){const ids=(S.mwTab==="practice"?items:shuffle(items)).slice(0,20).map(x=>x.id);list.append(el("button",{class:"btn primary",style:"align-self:flex-start",onclick:()=>startRound({game:"flash",pick:"manual",ids,size:ids.length})},S.mwTab==="practice"?t("mwPractiseThese",items.length):t("mwStartNew",items.length)));}
    if(!items.length)list.append(el("div",{class:"card flat"},el("span",{class:"small"},t("mwEmpty"))));
    for(const x of items.slice(0,300)){const s=wstat(x)||{};list.append(el("div",{class:"row between",style:"gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;cursor:pointer",onclick:()=>openDetail(x)},
      el("div",{},enEl(x,"say"),el("div",{class:"muted small"},TR(x))),S.mwTab==="new"?el("span",{class:"tag"},TP(x.topic)):el("span",{class:"tag "+col[S.mwTab]},t("mwStat",s.correct||0,s.wrong||0))));}
    if(items.length>300)list.append(el("p",{class:"muted small"},t("mwMore",items.length-300)));};
  q.oninput=draw;draw();box.append(tabs,q,list);}
EXTRA_VIEWS.mywords=viewMyWords;
{const _prog=viewProgress;viewProgress=function(w){const r=_prog(w);const box=el("div",{class:"stack",style:"gap:8px"});const sec=section(t("mwTitle"),box,el("button",{class:"btn ghost sm",onclick:()=>go("mywords")},t("mwOpen")));
  const first=w.querySelector("section");if(first)first.before(sec);else w.append(sec);mwSummary(box);return r;};}
{const _words=viewWords;viewWords=function(w){const r=_words(w);const h=w.querySelector("h1");const b=el("button",{class:"btn ghost sm",style:"margin:4px 0 8px",onclick:()=>go("mywords")},"✓ "+t("mwTitle"));if(h&&h.parentNode)h.parentNode.append(b);else w.prepend(b);return r;};}
/* ---------- offline: download every level automatically and show what is saved on this device ---------- */
Object.assign(T.en,{offTitle:"Offline",offIntro:"Every level is saved on this device automatically when you are online, so words, grammar and all games work without internet.",offSaved:"saved",offNot:"not saved yet",offBtn:"Save all levels now",offDone:"All levels are saved on this device.",offWorking:"Saving…",offNoNet:"You are offline: connect once to save the remaining levels."});
Object.assign(T.ru,{offTitle:"Без интернета",offIntro:"Все уровни автоматически сохраняются на этом устройстве, когда есть интернет, поэтому слова, грамматика и все игры работают без сети.",offSaved:"сохранён",offNot:"ещё не сохранён",offBtn:"Сохранить все уровни сейчас",offDone:"Все уровни сохранены на этом устройстве.",offWorking:"Сохраняем…",offNoNet:"Нет интернета: подключитесь один раз, чтобы сохранить остальные уровни."});
const OFF_KINDS=["vocab","grammar","gap"];
async function offHas(L){if(!("caches" in window))return null;try{for(const k of OFF_KINDS){const u=new URL("packs/"+k+"-"+L+".json",location.href).href;if(!(await caches.match(u)))return false;}return true;}catch(e){return null;}}
async function offSaveAll(){if(!navigator.onLine)return false;for(const L of LEVELS)for(const k of OFF_KINDS){try{await fetch("packs/"+k+"-"+L+".json");}catch(e){}}return true;}
async function offPanel(box){box.innerHTML="";const rows=el("div",{class:"row",style:"gap:8px;flex-wrap:wrap"});let all=true,unknown=false;
  for(const L of LEVELS){const h=await offHas(L);if(h===null)unknown=true;if(!h)all=false;rows.append(el("span",{class:"tag "+(h?"good":"")},L+" · "+(h?"✓ "+t("offSaved"):t("offNot"))));}
  const btn=el("button",{class:"btn"+(all?" ghost":" primary"),style:"align-self:flex-start",onclick:async()=>{btn.disabled=true;btn.textContent=t("offWorking");const ok=await offSaveAll();if(!ok)toast(t("offNoNet"),4000);offPanel(box);}},all?t("offDone"):t("offBtn"));
  box.append(el("p",{class:"muted small"},t("offIntro")),rows,unknown?null:btn);}
{const _prog2=viewProgress;viewProgress=function(w){const r=_prog2(w);const box=el("div",{class:"card stack",style:"gap:8px"});const sec=section(t("offTitle"),box);const first=w.querySelectorAll("section")[1];if(first)first.before(sec);else w.append(sec);offPanel(box);return r;};}
// save every level in the background shortly after the app starts (once per app version and device)
setTimeout(()=>{try{const k="biiwow.offline."+(document.querySelector('script')?LANG.code:"")+"."+(navigator.serviceWorker&&navigator.serviceWorker.controller?"sw":"nosw");if(!navigator.onLine||(navigator.connection&&navigator.connection.saveData))return;offSaveAll();}catch(e){}},6000);
/* ---------- each app keeps its own progress: clean a profile that was shared with other biiwow apps ---------- */
async function appSanitize(doc){if(!doc||doc.app===LANG.code)return;const [vs,gs]=await Promise.all([Promise.all(LEVELS.map(vocabFor)),Promise.all(LEVELS.map(grammarFor))]);if(vs.some(x=>!x)||gs.some(x=>!x))return;
  const wids=new Set(vs.flat().map(w=>w.id)),gids=new Set();LEVELS.forEach((L,i)=>gs[i].sections.forEach(s=>gids.add(L+":"+s.id)));
  const words=doc.words||{},mixed=Object.keys(words).some(id=>!wids.has(id))||Object.keys(doc.grammar||{}).some(k=>!gids.has(k));
  const keepW={};for(const[id,v]of Object.entries(words))if(wids.has(id))keepW[id]=v;doc.words=keepW;
  const keepG={};for(const[k,v]of Object.entries(doc.grammar||{}))if(gids.has(k))keepG[k]=v;doc.grammar=keepG;
  if(mixed){// keep only rounds that can be traced to this app's own words or grammar chapters, then recount points
    const times=[];for(const v of Object.values(keepW))if(v&&v.last)times.push(v.last);for(const v of Object.values(keepG))if(v&&v.lastAt)times.push(v.lastAt);
    const near=at=>times.some(x=>Math.abs(x-at)<5000);doc.sessions=(doc.sessions||[]).filter(s=>s.app===LANG.code||(!s.app&&(near(s.at)||(s.game==="gap"&&LEVELS.includes(s.level)))));
    doc.points=doc.sessions.reduce((a,s)=>a+(s.points||0),0);doc.gapOk={};doc.best={};
    const days=new Set(doc.sessions.map(s=>dayKey(new Date(s.at))));if(!days.size){doc.streakDays=0;doc.lastDay=null;}}
  const pl=doc.placement;if(pl&&pl.app!==LANG.code){const ok=!pl.app&&LEVELS.includes(pl.level)&&(pl.miss||[]).length>0&&(pl.miss||[]).every(m=>m.kind==="w"?wids.has(m.id):gids.has(m.level+":"+m.sid));if(ok)pl.app=LANG.code;else delete doc.placement;}
  for(const s of doc.sessions||[])if(!s.app)s.app=LANG.code;doc.app=LANG.code;
  if(S.doc===doc){if(!LEVELS.includes(S.level))S.level=LEVELS[0];touch();render();}}
{const _act=activate;activate=function(doc,key,opts){const r=_act(doc,key,opts);setTimeout(()=>appSanitize(S.doc),0);return r;};}
{const _touch=touch;touch=function(){if(S.doc&&S.doc.app===LANG.code)for(const s of S.doc.sessions||[])if(!s.app)s.app=LANG.code;return _touch();};}
