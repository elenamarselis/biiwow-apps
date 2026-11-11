// English translations for a Steps app's packs (so practice follows an English interface).
//   node tr-tool.js dump  <appdir> <LEVEL> [from] [to]   -> prints vocab items that still lack gloss_en: i|en|pos|ru|example|example_ru
//   node tr-tool.js odump <appdir> <LEVEL>               -> prints grammar "order" items lacking tr_en: section|id|answer|ru
//   node tr-tool.js rdump <appdir> <LEVEL>               -> prints grammar rule examples lacking tr_en: section|rule#|example#|target sentence|Russian
//   node tr-tool.js merge <appdir> <LEVEL> <file.json>   -> file: [[i,"en word","gloss_en","example_en"],...]  and/or {"order":[[section,id,"tr_en"],...],"rules":[[section,rule#,example#,"tr_en"],...]}
//   node tr-tool.js check <appdir> <LEVEL>               -> counts what is still missing; prints OK when complete
const fs=require("fs"),path=require("path");const [,,cmd,app,lvl,a3,a4]=process.argv;
const vf=path.join(app,"packs","vocab-"+lvl+".json"),gf=path.join(app,"packs","grammar-"+lvl+".json");
const V=JSON.parse(fs.readFileSync(vf,"utf8")),G=JSON.parse(fs.readFileSync(gf,"utf8"));
const cyr=s=>/[Ѐ-ӿ]/.test(String(s||""));
const rexs=()=>G.sections.flatMap(s=>(s.rules||[]).flatMap((r,ri)=>(r.examples||[]).map((x,xi)=>({s:s.id,ri,xi,x}))));
const orders=()=>G.sections.flatMap(s=>s.exercises.filter(e=>e.type==="order").map(e=>({s:s.id,e})));
if(cmd==="dump"){const from=+a3||0,to=a4?+a4:V.length;for(let i=from;i<to;i++){const x=V[i];if(!x.gloss_en)console.log([i,x.en,x.pos,x.ru,x.example,x.example_ru].join(" | "));}}
else if(cmd==="odump"){for(const {s,e} of orders())if(!e.tr_en)console.log([s,e.id,e.answer,e.ru||""].join(" | "));}
else if(cmd==="rdump"){for(const {s,ri,xi,x} of rexs())if(!x.tr_en)console.log([s,ri,xi,x.en,x.ru||""].join(" | "));}
else if(cmd==="merge"){const d=JSON.parse(fs.readFileSync(a3,"utf8"));const rows=Array.isArray(d)?d:(d.vocab||[]);let n=0,bad=[];
  for(const [i,w,g,ex] of rows){const x=V[i];if(!x||x.en!==w){bad.push(i+" "+w+" (pack has "+(x&&x.en)+")");continue;}
    if(!g||cyr(g)||!ex||cyr(ex)){bad.push(i+" "+w+": empty or Cyrillic text");continue;}x.gloss_en=String(g).trim();x.example_en=String(ex).trim();n++;}
  let m=0;for(const [sid,id,tr] of (d.order||[])){const o=orders().find(o=>o.s===sid&&o.e.id===id);if(!o||!tr||cyr(tr)){bad.push("order "+sid+"/"+id);continue;}o.e.tr_en=String(tr).trim();m++;}
  let k=0;for(const [sid,ri,xi,tr] of (d.rules||[])){const o=rexs().find(o=>o.s===sid&&o.ri===+ri&&o.xi===+xi);if(!o||!tr||cyr(tr)){bad.push("rule "+sid+"/"+ri+"/"+xi);continue;}o.x.tr_en=String(tr).trim();k++;}
  fs.writeFileSync(vf,JSON.stringify(V,null,1));fs.writeFileSync(gf,JSON.stringify(G,null,1));
  console.log("merged vocab "+n+", order "+m+", rule examples "+k+(bad.length?"\nREJECTED:\n "+bad.join("\n "):""));}
if(cmd==="check"||cmd==="merge"){const mv=V.filter(x=>!x.gloss_en||!x.example_en).length,mo=orders().filter(o=>!o.e.tr_en).length,mr=rexs().filter(o=>!o.x.tr_en).length;
  console.log(lvl+": vocab missing "+mv+"/"+V.length+", order missing "+mo+"/"+orders().length+", rule examples missing "+mr+"/"+rexs().length+(mv||mo||mr?"":"\nOK"));}
