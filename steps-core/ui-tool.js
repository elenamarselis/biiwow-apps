// Interface-language cleanup for a Steps app: everything shown in the English interface must be free of Russian,
// everything shown in the Russian interface must be free of English (target-language text is fine in both).
//   node steps-core/ui-tool.js ndump <appdir> <LEVEL>   vocab notes lacking note_en:            i | word | note_ru
//   node steps-core/ui-tool.js tdump <appdir> <LEVEL>   topics lacking topic_ru:                topic
//   node steps-core/ui-tool.js xdump <appdir> <LEVEL>   grammar exercises to review (one JSON per line): section|id|type|{q,options,pairs,words,answer}|existing ui
//   node steps-core/ui-tool.js edump <appdir> <LEVEL>   English text fields that contain Cyrillic: path | text
//   node steps-core/ui-tool.js merge <appdir> <LEVEL> <file.json>
//        {"notes":[[i,"word","note_en"]], "topics":[["Topic","Тема"]], "ex":[["section","id",{"en":{...},"ru":{...}}]], "entext":[["path","new English text"]]}
//        ui.en / ui.ru may override q, options (same length and order), pairs (same length), words, answer.
//   node steps-core/ui-tool.js check <appdir> <LEVEL>   prints what is missing; OK when clean
const fs=require("fs"),path=require("path");const [,,cmd,app,lvl,file]=process.argv;
const vf=path.join(app,"packs","vocab-"+lvl+".json"),gf=path.join(app,"packs","grammar-"+lvl+".json");
const V=JSON.parse(fs.readFileSync(vf,"utf8")),G=JSON.parse(fs.readFileSync(gf,"utf8"));const cfg=JSON.parse(fs.readFileSync(path.join(app,"config.json"),"utf8"));
const cyr=s=>/[Ѐ-ӿ]/.test(typeof s==="string"?s:JSON.stringify(s||""));
const META=/\b(correct|incorrect|sentence|which|true|false|means?|choose|form|russian|english|answer|word|translate|translation|right|wrong|is used|are used|grammatical|ungrammatical)\b/i;
const exs=()=>G.sections.flatMap(s=>s.exercises.map(e=>({s,e})));
const vis=e=>({q:e.q,options:e.options,pairs:e.pairs,words:e.words,answer:e.answer});
function needs(e){const f=vis(e);const r={};if(cyr(f))r.en=true;if(e.type==="tf")r.ru=true;else if(typeof e.q==="string"&&META.test(e.q)&&!cyr(e.q))r.ru=true;if(cfg.code!=="en"&&e.type==="match"&&!cyr(e.pairs)&&META.test(JSON.stringify(e.pairs)))r.ru=true;return r;}
function enPaths(){const out=[];const add=(p,v)=>{if(typeof v==="string"&&cyr(v))out.push([p,v]);};
  G.sections.forEach((s,i)=>{add(`sections.${i}.title_en`,s.title_en);add(`sections.${i}.summary_en`,s.summary_en);
    s.rules.forEach((r,j)=>{add(`sections.${i}.rules.${j}.title_en`,r.title_en);add(`sections.${i}.rules.${j}.body_en`,r.body_en);(r.examples||[]).forEach((x,k)=>add(`sections.${i}.rules.${j}.examples.${k}.tr_en`,x.tr_en));});
    s.exercises.forEach((e,k)=>{add(`sections.${i}.exercises.${k}.explain_en`,e.explain_en);add(`sections.${i}.exercises.${k}.tr_en`,e.tr_en);});});
  V.forEach((x,i)=>{add(`vocab.${i}.gloss_en`,x.gloss_en);add(`vocab.${i}.example_en`,x.example_en);add(`vocab.${i}.note_en`,x.note_en);});return out;}
function setPath(p,val){const parts=p.split(".");let o=parts[0]==="vocab"?V:G;const rest=parts[0]==="vocab"?parts.slice(1):parts;for(let i=0;i<rest.length-1;i++)o=o[rest[i]];o[rest[rest.length-1]]=val;}
if(cmd==="ndump"){V.forEach((x,i)=>{if(x.note_ru&&!x.note_en)console.log([i,x.en,x.note_ru].join(" | "));});}
else if(cmd==="tdump"){[...new Set(V.filter(x=>!x.topic_ru).map(x=>x.topic))].forEach(t=>console.log(t));}
else if(cmd==="xdump"){for(const {s,e} of exs()){const n=needs(e);if(!n.en&&!n.ru)continue;const u=e.ui||{};if((!n.en||u.en)&&(!n.ru||u.ru))continue;console.log([s.id,e.id,e.type,"needs "+Object.keys(n).join("+"),JSON.stringify(vis(e)),u.en||u.ru?"has ui "+JSON.stringify(u):""].join(" | "));}}
else if(cmd==="edump"){for(const [p,v] of enPaths())console.log(p+" | "+v);}
else if(cmd==="merge"){const d=JSON.parse(fs.readFileSync(file,"utf8"));const bad=[];let n=0,t=0,x=0,e=0;
  for(const [i,w,ne] of d.notes||[]){const v=V[i];if(!v||v.en!==w||!ne||cyr(ne)){bad.push("note "+i+" "+w);continue;}v.note_en=String(ne).trim();n++;}
  for(const [en,ru] of d.topics||[]){if(!ru||!cyr(ru)){bad.push("topic "+en);continue;}let hit=0;for(const v of V)if(v.topic===en){v.topic_ru=ru;hit++;}hit?t++:bad.push("topic not found "+en);}
  for(const [sid,id,ui] of d.ex||[]){const s=G.sections.find(s=>s.id===sid);const ex=s&&s.exercises.find(e=>e.id===id);if(!ex){bad.push("ex not found "+sid+"/"+id);continue;}
    const err=[];for(const L of ["en","ru"]){const o=ui&&ui[L];if(!o)continue;for(const k of Object.keys(o))if(!["q","options","pairs","words","answer"].includes(k))err.push(L+": unknown key "+k);
      if(L==="en"&&cyr(o))err.push("en overlay has Cyrillic");if(o.options&&(!Array.isArray(o.options)||o.options.length!==(ex.options||[]).length))err.push(L+": options length differs");
      if(o.pairs&&(!Array.isArray(o.pairs)||o.pairs.length!==(ex.pairs||[]).length))err.push(L+": pairs length differs");if(L==="ru"&&o.q!==undefined&&!cyr(o.q))err.push("ru q must be Russian");}
    if(err.length){bad.push("ex "+sid+"/"+id+": "+err.join("; "));continue;}ex.ui=Object.assign(ex.ui||{},ui);x++;}
  for(const [p,txt] of d.entext||[]){if(!txt||cyr(txt)){bad.push("entext "+p+": empty or still Cyrillic");continue;}try{setPath(p,String(txt).trim());e++;}catch(err){bad.push("entext bad path "+p);}}
  fs.writeFileSync(vf,JSON.stringify(V,null,1));fs.writeFileSync(gf,JSON.stringify(G,null,1));
  console.log(`merged notes ${n}, topics ${t}, exercises ${x}, en texts ${e}`+(bad.length?"\nREJECTED:\n  "+bad.join("\n  "):""));}
if(cmd==="check"||cmd==="merge"){const mn=V.filter(x=>x.note_ru&&!x.note_en).length,mt=new Set(V.filter(x=>!x.topic_ru).map(x=>x.topic)).size;
  let mx=0;for(const {e} of exs()){const n=needs(e),u=e.ui||{};if((n.en&&!u.en)||(n.ru&&!u.ru))mx++;}const me=enPaths().length;
  console.log(`${lvl}: notes missing ${mn}, topics missing ${mt}, exercises to fix ${mx}, English texts with Cyrillic ${me}`+(mn||mt||mx||me?"":"\nOK"));}
