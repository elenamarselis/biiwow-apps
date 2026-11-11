
/* ---------- level test: 20 questions from A1 up, recommended level + levels worth revising ---------- */
Object.assign(T.en,{ptCardTitle:"Test my level",ptCardText:"20 questions from A1 upwards, about 5 minutes. You get a recommended level and a list of what to revise.",ptStart:"Start the test",ptRetake:"Take the test again",
  ptLast:(l,d)=>`Last test: ${l} · ${d}`,ptQ:(i,n)=>`Question ${i} of ${n}`,ptWordQ:"What does this word mean?",ptGramQ:"Choose the correct answer",ptDontKnow:"I don't know",ptQuit:"Stop the test",
  ptNeedNet:"The test needs every level once. Connect to the internet and try again.",ptResultEyebrow:"Your level test",ptRec:(l,n)=>`Recommended level: ${l} · ${n}`,
  ptRecText:(l,below,rev)=>below?(rev?`Start studying at ${l}. You mostly know ${below}; revise the points below.`:`Start studying at ${l}. You already know ${below} well.`):`Start at ${l}: this is the right place to begin.`,ptTop:(l)=>`You passed every level. Keep polishing ${l}.`,
  ptPerLevel:"Result by level",ptRevise:"Worth revising",ptNoRevise:"No gaps in the levels below your recommended level.",ptReviseWords:"Words",ptReviseGrammar:"Grammar",ptOpen:"Open",
  ptGoLevel:l=>`Start studying at ${l}`,ptHome:"Back to home",ptCorrect:(c,n)=>`${c} of ${n}`,ptAbove:"You also got some higher-level questions right: a good sign for later."});
Object.assign(T.ru,{ptCardTitle:"Проверить мой уровень",ptCardText:"20 вопросов от A1 и выше, около 5 минут. Вы получите рекомендованный уровень и список того, что стоит повторить.",ptStart:"Начать тест",ptRetake:"Пройти тест снова",
  ptLast:(l,d)=>`Последний тест: ${l} · ${d}`,ptQ:(i,n)=>`Вопрос ${i} из ${n}`,ptWordQ:"Что значит это слово?",ptGramQ:"Выберите правильный ответ",ptDontKnow:"Не знаю",ptQuit:"Прервать тест",
  ptNeedNet:"Для теста нужны все уровни. Подключитесь к интернету и попробуйте снова.",ptResultEyebrow:"Тест уровня",ptRec:(l,n)=>`Рекомендуемый уровень: ${l} · ${n}`,
  ptRecText:(l,below,rev)=>below?(rev?`Начните заниматься с уровня ${l}. ${below} вы в основном знаете, но повторите пункты ниже.`:`Начните заниматься с уровня ${l}. ${below} вы уже знаете хорошо.`):`Начните с уровня ${l}: это правильная отправная точка.`,ptTop:(l)=>`Вы прошли все уровни. Продолжайте совершенствовать ${l}.`,
  ptPerLevel:"Результат по уровням",ptRevise:"Стоит повторить",ptNoRevise:"В уровнях ниже рекомендованного пробелов нет.",ptReviseWords:"Слова",ptReviseGrammar:"Грамматика",ptOpen:"Открыть",
  ptGoLevel:l=>`Заниматься с уровня ${l}`,ptHome:"На главную",ptCorrect:(c,n)=>`${c} из ${n}`,ptAbove:"Вы ответили правильно и на некоторые вопросы более высоких уровней: хороший знак на будущее."});
const PT_N=20,hasCyr=s=>/[Ѐ-ӿ]/.test(String(s||""));
const ptOpt=w=>UI==="en"&&LANG.code==="en"?(w.def||TR(w)):String(TR(w));
function ptPlan(){const n=LEVELS.length,base=Math.floor(PT_N/n);const c=LEVELS.map(()=>base);let r=PT_N-base*n;const mid=[...LEVELS.keys()].sort((a,b)=>Math.abs(a-(n-1)/2)-Math.abs(b-(n-1)/2));for(const i of mid){if(!r)break;c[i]++;r--;}return c;}
function ptWordQ(level,v,used){const pool=shuffle(v.filter(w=>w.pos!=="phrase"&&!used.has(w.id)&&ptOpt(w)));const w=pool[0];if(!w)return null;used.add(w.id);
  const key=x=>norm(ptOpt(x));let d=shuffle(v.filter(x=>x.id!==w.id&&x.pos===w.pos&&key(x)!==key(w)));if(d.length<3)d=d.concat(shuffle(v.filter(x=>x.id!==w.id&&x.pos!==w.pos&&key(x)!==key(w))));
  const opts=[w];for(const x of d){if(opts.length>=4)break;if(!opts.some(o=>key(o)===key(x)))opts.push(x);}const sh=shuffle(opts);
  return {level,kind:"w",item:w,options:sh.map(ptOpt),answer:sh.indexOf(w)};}
function ptGramQ(level,g,used){const cands=[];for(const s of g.sections)for(const e of s.exercises)if(e.type==="mc"&&Array.isArray(e.options)&&e.options.length>=3&&!hasCyr(e.q)&&!e.options.some(hasCyr)&&!used.has(s.id))cands.push({s,e});
  const pick=shuffle(cands)[0];if(!pick)return null;used.add(pick.s.id);return {level,kind:"g",sec:pick.s,ex:pick.e,q:pick.e.q,options:pick.e.options.map(String),answer:pick.e.answer};}
async function ptBuild(){const [vs,gs]=await Promise.all([Promise.all(LEVELS.map(vocabFor)),Promise.all(LEVELS.map(grammarFor))]);if(vs.some(x=>!x)||gs.some(x=>!x))return null;
  const plan=ptPlan(),qs=[];LEVELS.forEach((L,i)=>{const k=plan[i],ng=Math.floor(k/2),nw=k-ng,uw=new Set(),ug=new Set();const lv=[];
    for(let j=0;j<ng;j++){const q=ptGramQ(L,gs[i],ug);if(q)lv.push(q);}while(lv.length<k){const q=ptWordQ(L,vs[i],uw);if(!q)break;lv.push(q);}
    qs.push(...shuffle(lv));});return qs;}
async function ptStart(){if(S.round||S.test)return;S.pt={loading:true};go("ptest");const qs=await ptBuild();if(!S.pt)return;if(!qs||!qs.length){S.pt=null;toast(t("ptNeedNet"),4000);go("home");return;}S.pt={qs,i:0,answers:[]};render();}
function viewPTest(w){const P=S.pt;if(!P){go("home");return;}if(P.loading){w.append(el("p",{class:"muted"},t("loading")));return;}
  const q=P.qs[P.i],n=P.qs.length;
  w.append(el("div",{class:"row between",style:"align-items:center"},el("span",{class:"small",style:"font-weight:700"},t("ptQ",P.i+1,n)),el("button",{class:"btn ghost",style:"padding:6px 10px",onclick:()=>{S.pt=null;go("home");}},t("ptQuit"))));
  w.append(el("div",{style:"height:6px;border-radius:99px;background:var(--line,#e8e0d6);overflow:hidden;margin:6px 0 14px"},el("div",{style:"height:100%;width:"+Math.round(P.i/n*100)+"%;background:var(--accent)"})));
  const area=el("div",{class:"stack"});w.append(area);let done=false;
  const finish=(ok,btn,grid)=>{if(done)return;done=true;P.answers.push({...q,ok});if(btn)btn.classList.add(ok?"right":"wrong");[...grid.children].forEach((b,j)=>{if(j===q.answer)b.classList.add("right");else if(b!==btn)b.classList.add("dim");});
    if(q.kind==="w")Voice.speak(q.item.en);setTimeout(()=>{if(S.pt!==P)return;P.i++;if(P.i>=P.qs.length)ptFinish();else render();},ok?700:1500);};
  if(q.kind==="w"){area.append(el("div",{class:"eyebrow"},t("ptWordQ")),el("div",{class:"prompt"},el("div",{class:"row",style:"justify-content:center;gap:12px"},enEl(q.item,"target xl"),spkBtn(q.item.en)),q.item.ipa?el("div",{class:"ipa"},"/"+q.item.ipa+"/"):null));}
  else area.append(el("div",{class:"eyebrow"},t("ptGramQ")),el("div",{class:"prompt"},el("div",{style:"font-size:1.15rem",lang:LANG.code},q.q)));
  const grid=el("div",{class:"answers"});q.options.forEach((o,j)=>grid.append(el("button",{class:"ans",lang:q.kind==="g"?LANG.code:null,onclick:e=>finish(j===q.answer,e.currentTarget,grid)},o)));area.append(grid);
  area.append(el("button",{class:"btn ghost",style:"align-self:center",onclick:()=>finish(false,null,grid)},t("ptDontKnow")));}
function ptScore(answers){const by={};for(const L of LEVELS)by[L]={c:0,n:0};for(const a of answers){by[a.level].n++;if(a.ok)by[a.level].c++;}
  const pass=L=>by[L].n&&by[L].c/by[L].n>=0.66;let rec=LEVELS.find(L=>!pass(L))||null;return {by,rec,top:!rec};}
function ptFinish(){const P=S.pt;const sc=ptScore(P.answers);const rec=sc.rec||LEVELS[LEVELS.length-1];
  S.doc.placement={at:Date.now(),level:rec,top:sc.top,by:sc.by,miss:P.answers.filter(a=>!a.ok).map(a=>a.kind==="w"?{level:a.level,kind:"w",id:a.item.id,en:a.item.en,tr:ptOpt(a.item)}:{level:a.level,kind:"g",sid:a.sec.id,title_en:a.sec.title_en,title_ru:a.sec.title_ru})};
  touch();S.pt=null;go("ptresult");}
function viewPTResult(w){const R=S.doc.placement;if(!R){go("home");return;}const rec=R.level,ri=LEVELS.indexOf(rec);
  const below=LEVELS.slice(0,R.top?LEVELS.length:ri);const belowTxt=below.length?(below.length>1?below[0]+"–"+below[below.length-1]:below[0]):"";
  w.append(el("div",{},el("p",{class:"eyebrow"},t("ptResultEyebrow")),el("h1",{},t("ptRec",rec,t("level"+rec))),el("p",{class:"muted"},R.top?t("ptTop",rec):t("ptRecText",rec,belowTxt,(R.miss||[]).some(m=>LEVELS.indexOf(m.level)<ri)))));
  const rows=el("div",{class:"stack"});for(const L of LEVELS){const s=R.by[L]||{c:0,n:0};const r=s.n?s.c/s.n:0;const cls=r>=0.66?"good":r>=0.34?"gold":"bad";
    rows.append(el("div",{class:"row",style:"gap:10px;align-items:center"},el("span",{class:"tag",style:"min-width:2.6em;text-align:center"+(L===rec?";background:var(--accent);color:#fff":"")},L),
      el("div",{style:"flex:1;height:10px;border-radius:99px;background:var(--line,#e8e0d6);overflow:hidden"},el("div",{style:"height:100%;width:"+Math.round(r*100)+"%;background:var(--"+(cls==="good"?"good":cls==="gold"?"gold":"bad")+",var(--accent))"})),
      el("span",{class:"tag "+cls},t("ptCorrect",s.c,s.n))));}
  w.append(section(t("ptPerLevel"),el("div",{class:"card"},rows)));
  const rev=el("div",{class:"stack"});const lowMiss=(R.miss||[]).filter(m=>R.top||LEVELS.indexOf(m.level)<ri);
  if(!lowMiss.length)rev.append(el("div",{class:"card flat"},el("span",{class:"small"},t("ptNoRevise"))));
  for(const L of LEVELS){const ms=lowMiss.filter(m=>m.level===L);if(!ms.length)continue;const ws=ms.filter(m=>m.kind==="w"),gs=ms.filter(m=>m.kind==="g");const card=el("div",{class:"card stack"},el("div",{class:"row between"},el("h3",{},L+" · "+t("level"+L)),el("span",{class:"tag bad"},t("ptCorrect",R.by[L].c,R.by[L].n))));
    if(ws.length)card.append(el("div",{},el("p",{class:"eyebrow"},t("ptReviseWords")),...ws.map(m=>el("div",{class:"small"},el("b",{lang:LANG.code},m.en)," — "+m.tr)),el("button",{class:"btn ghost",style:"margin-top:6px",onclick:()=>{S.level=L;touch();go("words");}},t("ptOpen")+" · "+t("words")+" "+L)));
    if(gs.length)card.append(el("div",{},el("p",{class:"eyebrow"},t("ptReviseGrammar")),...gs.map(m=>el("div",{class:"row between",style:"gap:8px"},el("span",{class:"small"},UI==="ru"?m.title_ru:m.title_en),el("button",{class:"btn ghost",onclick:()=>{S.level=L;touch();go("gsection",{sid:m.sid});}},t("ptOpen"))))));
    rev.append(card);}
  w.append(section(t("ptRevise"),rev));
  const above=LEVELS.slice(ri+1).some(L=>R.by[L]&&R.by[L].c>0);if(!R.top&&above)w.append(el("p",{class:"muted small"},t("ptAbove")));
  w.append(el("div",{class:"row",style:"gap:8px;flex-wrap:wrap;margin-top:8px"},el("button",{class:"btn primary",onclick:()=>{S.level=rec;touch();go("home");}},t("ptGoLevel",rec)),el("button",{class:"btn",onclick:ptStart},t("ptRetake")),el("button",{class:"btn ghost",onclick:()=>go("home")},t("ptHome"))));}
function ptHomeCard(){const R=S.doc&&S.doc.placement;const d=R?new Date(R.at).toLocaleDateString(UI==="ru"?"ru-RU":"en-GB"):"";
  return el("div",{class:"card stack",style:R?"":"border:2px solid var(--accent)"},el("div",{class:"row between"},el("h3",{},t("ptCardTitle")),R?el("span",{class:"tag"},t("ptLast",R.level,d)):null),el("p",{class:"muted small"},t("ptCardText")),
    el("div",{class:"row",style:"gap:8px;flex-wrap:wrap"},el("button",{class:"btn primary",onclick:ptStart},R?t("ptRetake"):t("ptStart")),R?el("button",{class:"btn ghost",onclick:()=>go("ptresult")},t("ptRec",R.level,t("level"+R.level))):null));}
const EXTRA_VIEWS={ptest:viewPTest,ptresult:viewPTResult};
{const _go=go;go=function(v,e){if(v!=="ptest"&&S.pt&&!S.pt.loading)S.pt=null;_go(v,e);};}
{const _home=viewHome;viewHome=function(w){const r=_home(w);const R=S.doc&&S.doc.placement;const c=ptHomeCard();const qs=w.querySelector(".quick");const sec=qs&&qs.closest("section");if(sec){if(R)sec.after(c);else sec.before(c);}else w.append(c);return r;};}
