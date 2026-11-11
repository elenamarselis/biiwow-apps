
/* ---------- fill the gap: type the missing word (word forms, vocabulary, grammar words) ---------- */
Object.assign(T.en,{gGap:"Fill the gap",gGapD:"type the missing word: forms, words, grammar",gapTitle:"Fill the gap",gapIntro:"A sentence with one word missing. Type it exactly, with the right ending and accents. Hints cost points.",
  gapKind:"What to practise",gapAll:"Everything",gapForm:"Word forms",gapWord:"Vocabulary",gapGram:"Grammar words",gapFormD:"the word is given in brackets: put it in the right form",gapWordD:"you get the meaning: find the word and its form",gapGramD:"prepositions, articles, pronouns, particles: no clue",
  gapSize:"Sentences",gapStart:"Start",gapNone:"No sentences for this level yet.",gapMeaning:"Meaning",gapHintTr:"Show translation",gapHintFirst:"First letter",gapCheck:"Check",gapNext:"Next",gapSkip:"Show answer",
  gapRight:"Correct",gapAlmost:"Almost: check the accents and special letters",gapWrong:"Not quite",gapAnswer:"Answer",gapDone:"Round finished",gapScore:(c,n)=>`${c} of ${n} correct`,gapReview:"Review your mistakes",gapAgain:"Play again",gapType:"type here",gapHintCost:"−5 points",gapQuit:"Finish"});
Object.assign(T.ru,{gGap:"Заполни пропуск",gGapD:"впишите пропущенное слово: формы, слова, грамматика",gapTitle:"Заполни пропуск",gapIntro:"В предложении пропущено одно слово. Впишите его точно — с правильным окончанием и диакритикой. Подсказки стоят очков.",
  gapKind:"Что тренировать",gapAll:"Всё",gapForm:"Формы слов",gapWord:"Слова",gapGram:"Служебные слова",gapFormD:"слово дано в скобках — поставьте его в нужную форму",gapWordD:"дано значение — найдите слово и его форму",gapGramD:"предлоги, артикли, местоимения, частицы — без подсказки",
  gapSize:"Предложений",gapStart:"Начать",gapNone:"Для этого уровня предложений пока нет.",gapMeaning:"Значение",gapHintTr:"Показать перевод",gapHintFirst:"Первая буква",gapCheck:"Проверить",gapNext:"Дальше",gapSkip:"Показать ответ",
  gapRight:"Верно",gapAlmost:"Почти: проверьте диакритику и особые буквы",gapWrong:"Неверно",gapAnswer:"Ответ",gapDone:"Раунд окончен",gapScore:(c,n)=>`Верно ${c} из ${n}`,gapReview:"Разбор ошибок",gapAgain:"Ещё раз",gapType:"впишите сюда",gapHintCost:"−5 очков",gapQuit:"Закончить"});
GAMES.gap={k:"gGap",d:"gGapD",icon:"✎",base:20};
async function gapFor(level){S.gapP=S.gapP||{};if(S.gapP[level]!==undefined)return S.gapP[level];try{const r=await fetch("packs/gap-"+level+".json",{cache:"force-cache"});if(!r.ok)throw 0;const a=await r.json();S.gapP[level]=Array.isArray(a)&&a.length?a:null;}catch(e){S.gapP[level]=null;}return S.gapP[level];}
const gapN=s=>String(s||"").toLowerCase().replace(/[’`´]/g,"'").replace(/\s+/g," ").replace(/^[\s"«»„“]+|[\s.,!?;:"«»“”]+$/g,"").trim();
const gapLoose=s=>gapN(s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ß/g,"ss").replace(/đ/g,"dj").replace(/ł/g,"l");
const gapKindLabel=k=>t({form:"gapForm",word:"gapWord",grammar:"gapGram"}[k]);
async function viewGapSetup(w){const L=S.level;const cfg=S.gapCfg=S.gapCfg||{kind:"all",size:10};
  w.append(el("div",{},el("p",{class:"eyebrow"},t("levelWord")+" "+L),el("h1",{},t("gapTitle")),el("p",{class:"muted"},t("gapIntro"))));
  const box=el("div",{class:"stack"},el("span",{class:"muted small"},t("loading")));w.append(box);const P=await gapFor(L);if(S.view!=="gap")return;box.innerHTML="";
  if(!P){box.append(el("div",{class:"card"},t("gapNone")));return;}
  const kinds=[["all","gapAll",null],["form","gapForm","gapFormD"],["word","gapWord","gapWordD"],["grammar","gapGram","gapGramD"]];
  const kb=el("div",{class:"games"});const draw=()=>{kb.innerHTML="";for(const[k,lab,d]of kinds){const n=k==="all"?P.length:P.filter(x=>x.kind===k).length;kb.append(el("button",{class:"game","aria-pressed":cfg.kind===k?"true":"false",style:cfg.kind===k?"border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)":"",onclick:()=>{cfg.kind=k;draw();}},el("span",{class:"t"},t(lab)),d?el("span",{class:"d"},t(d)):null,el("span",{class:"muted small"},n)));}};draw();
  const sz=el("div",{class:"row",style:"gap:8px;flex-wrap:wrap"});const drawSz=()=>{sz.innerHTML="";for(const n of[10,20,30])sz.append(el("button",{class:"btn"+(cfg.size===n?" primary":""),onclick:()=>{cfg.size=n;drawSz();}},String(n)));};drawSz();
  box.append(section(t("gapKind"),kb),section(t("gapSize"),sz),el("button",{class:"btn primary",style:"align-self:flex-start",onclick:()=>gapStart(L,P,cfg)},t("gapStart")));}
function gapStart(L,P,cfg){const done=(S.doc.gapOk=S.doc.gapOk||{});let pool=P.filter(x=>cfg.kind==="all"||x.kind===cfg.kind);const fresh=shuffle(pool.filter(x=>!done[L+":"+x.id])),old=shuffle(pool.filter(x=>done[L+":"+x.id]));
  const items=fresh.concat(old).slice(0,cfg.size);S.gapR={L,items,i:0,res:[],points:0,streak:0,t0:Date.now()};go("gapplay");}
function viewGapPlay(w){const R=S.gapR;if(!R){go("gap");return;}const x=R.items[R.i],n=R.items.length;let hints=0,done=false;
  w.append(el("div",{class:"row between",style:"align-items:center"},el("span",{class:"small",style:"font-weight:700"},t("gapTitle")+" · "+R.L+" · "+(R.i+1)+" / "+n),el("span",{class:"tag gold",id:"gpts"},"★ "+R.points),el("button",{class:"btn ghost",style:"padding:6px 10px",onclick:()=>gapFinish()},t("gapQuit"))));
  w.append(el("div",{style:"height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin:6px 0 14px"},el("div",{style:"height:100%;width:"+Math.round(R.i/n*100)+"%;background:var(--accent)"})));
  const [a,b]=String(x.text).split("___");const inp=el("input",{type:"text",autocomplete:"off",autocapitalize:"off",spellcheck:"false",lang:LANG.code,placeholder:t("gapType"),style:"display:inline-block;width:"+Math.max(6,Math.min(18,(x.answer[0]||"").length+3))+"ch;font:inherit;padding:2px 8px;margin:2px 4px;border:0;border-bottom:2px solid var(--accent);background:var(--accent-soft);border-radius:6px;text-align:center"});
  const card=el("div",{class:"prompt",style:"text-align:left"},el("div",{class:"eyebrow"},gapKindLabel(x.kind)),el("div",{style:"font-size:1.25rem;line-height:2.1",lang:LANG.code},a,inp,b,x.kind==="form"?el("span",{class:"muted",style:"margin-left:6px"},"("+x.lemma+")"):null));
  if(x.kind==="word")card.append(el("div",{class:"small",style:"margin-top:6px"},el("b",{},t("gapMeaning")+": "),UI==="ru"?x.clue_ru:x.clue_en));
  const hintBox=el("div",{class:"small muted stack",style:"gap:4px"});card.append(hintBox);w.append(card);
  const tr=UI==="ru"?x.tr_ru:(x.tr_en||"");const hb=el("div",{class:"row",style:"gap:8px;flex-wrap:wrap;margin-top:8px"});
  if(tr)hb.append(el("button",{class:"btn ghost",title:t("gapHintCost"),onclick:e=>{if(done)return;hints++;e.currentTarget.remove();hintBox.append(el("div",{},"💬 "+tr));}},t("gapHintTr")+" · "+t("gapHintCost")));
  hb.append(el("button",{class:"btn ghost",title:t("gapHintCost"),onclick:e=>{if(done)return;hints++;e.currentTarget.remove();hintBox.append(el("div",{},"🔤 "+String(x.answer[0]).slice(0,1)+"…"));}},t("gapHintFirst")+" · "+t("gapHintCost")));
  const fb=el("div",{class:"stack"});const btn=el("button",{class:"btn primary"},t("gapCheck"));
  const finish=(val,skip)=>{if(done)return;done=true;inp.disabled=true;const v=gapN(val);const ok=!skip&&!!v&&x.answer.some(s=>gapN(s)===v);const almost=!ok&&!skip&&!!v&&x.answer.some(s=>gapLoose(s)===gapLoose(v));
    const pts=ok?Math.max(5,GAMES.gap.base-5*hints)+Math.min(R.streak,5)*2:0;if(ok){R.streak++;R.points+=pts;}else R.streak=0;R.res.push({x,ok,val,hints});
    inp.style.background=ok?"var(--good-soft)":"var(--bad-soft)";inp.style.borderBottomColor=ok?"var(--good)":"var(--bad)";const full=a+x.answer[0]+b;
    fb.append(el("div",{class:"feedback "+(ok?"ok":"no")},el("b",{},ok?t("gapRight"):almost?t("gapAlmost"):t("gapWrong")),ok?null:el("span",{},t("gapAnswer")+": ",el("b",{lang:LANG.code},x.answer.join(" / ")))),
      el("div",{class:"card flat stack",style:"gap:6px"},el("div",{class:"row",style:"gap:8px;align-items:center"},el("span",{lang:LANG.code,style:"font-weight:600"},full),spkBtn(full,"sm")),tr?el("div",{class:"muted small"},tr):null,el("div",{class:"small"},UI==="ru"?x.explain_ru:x.explain_en)));
    $("#gpts").textContent="★ "+R.points;Voice.speak(full);btn.textContent=t("gapNext");btn.onclick=gapNext;btn.focus();};
  btn.onclick=()=>finish(inp.value);inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();done?gapNext():finish(inp.value);}};
  w.append(hb,el("div",{class:"row",style:"gap:8px;margin-top:10px"},btn,el("button",{class:"btn ghost",onclick:()=>finish("",true)},t("gapSkip"))),fb);setTimeout(()=>inp.focus(),60);}
function gapNext(){const R=S.gapR;if(!R)return;R.i++;if(R.i>=R.items.length)gapFinish();else render();}
function gapFinish(){const R=S.gapR;if(!R)return;if(!R.res.length){S.gapR=null;go("gap");return;}const P=S.doc;const correct=R.res.filter(r=>r.ok).length;const bonus=bumpDay();P.points=(P.points||0)+R.points+bonus;
  P.gapOk=P.gapOk||{};for(const r of R.res)if(r.ok)P.gapOk[R.L+":"+r.x.id]=1;
  P.sessions.unshift({at:Date.now(),game:"gap",level:R.L,size:R.items.length,correct,total:R.res.length,points:R.points+bonus,ms:Date.now()-R.t0});if(P.sessions.length>300)P.sessions.length=300;
  R.bonus=bonus;S.gapLast=R;S.gapR=null;touch();renderShell();go("gapres");}
function viewGapRes(w){const R=S.gapLast;if(!R){go("gap");return;}const c=R.res.filter(r=>r.ok).length;
  w.append(el("div",{},el("p",{class:"eyebrow"},t("gapTitle")+" · "+R.L),el("h1",{},t("gapDone")),el("p",{class:"muted"},t("gapScore",c,R.res.length)+" · ★ "+(R.points+(R.bonus||0)))));
  const wrong=R.res.filter(r=>!r.ok);if(wrong.length){const list=el("div",{class:"stack"});for(const r of wrong){const[a,b]=String(r.x.text).split("___");list.append(el("div",{class:"card stack",style:"gap:4px"},el("span",{class:"tag"},gapKindLabel(r.x.kind)),
      el("div",{lang:LANG.code},a,el("b",{style:"color:var(--good)"},r.x.answer[0]),b),r.val?el("div",{class:"small",style:"color:var(--bad)"},"✗ "+r.val):null,el("div",{class:"small muted"},UI==="ru"?r.x.explain_ru:r.x.explain_en)));}
    w.append(section(t("gapReview"),list));}
  w.append(el("div",{class:"row",style:"gap:8px;margin-top:8px"},el("button",{class:"btn primary",onclick:()=>go("gap")},t("gapAgain")),el("button",{class:"btn ghost",onclick:()=>go("games")},t("games"))));}
Object.assign(EXTRA_VIEWS,{gap:viewGapSetup,gapplay:viewGapPlay,gapres:viewGapRes});
{const _go2=go;go=function(v,e){if(v==="setup"&&e&&e.game==="gap")v="gap";if(v!=="gapplay"&&S.gapR&&S.view==="gapplay"&&v!=="gapres")S.gapR=null;_go2(v,e);};}
