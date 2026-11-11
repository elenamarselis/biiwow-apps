// "Fill the gap" packs: packs/gap-<LEVEL>.json, one JSON array of 120 items (40 form, 40 word, 40 grammar).
//   node steps-core/gap-tool.js add   <appdir> <LEVEL> <file.json>   append items from a JSON array (ids are assigned); invalid items are rejected and listed
//   node steps-core/gap-tool.js check <appdir> <LEVEL>               validate the pack; prints OK when complete
const fs=require("fs"),path=require("path");const [,,cmd,app,lvl,file]=process.argv;
const pf=path.join(app,"packs","gap-"+lvl+".json");const cfg=JSON.parse(fs.readFileSync(path.join(app,"config.json"),"utf8"));const isEN=cfg.code==="en";
const load=f=>fs.existsSync(f)?JSON.parse(fs.readFileSync(f,"utf8")):[];
const V=load(path.join(app,"packs","vocab-"+lvl+".json")),G=JSON.parse(fs.readFileSync(path.join(app,"packs","grammar-"+lvl+".json"),"utf8"));
const vset=new Set(V.map(x=>String(x.en).toLowerCase())),gset=new Set(G.sections.map(s=>s.id));
const cyr=s=>/[Ѐ-ӿ]/.test(String(s||""));const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’`]/g,"'").replace(/\s+/g," ").trim();
const LEVELS=["A1","A2","B1","B2","C1","C2"];
function problems(x,all){const p=[];const k=x.kind;if(!["form","word","grammar"].includes(k))p.push("kind must be form|word|grammar");
  if(typeof x.text!=="string"||(x.text.match(/___/g)||[]).length!==1)p.push("text must contain exactly one ___");
  if(!Array.isArray(x.answer)||!x.answer.length||x.answer.some(a=>typeof a!=="string"||!a.trim()))p.push("answer must be a non-empty array of strings");
  else{const t=N(String(x.text||"").replace("___",""));if(x.answer.some(a=>N(a).length>2&&new RegExp("(^|[^\\p{L}])"+N(a).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^\\p{L}])","u").test(t)))p.push("the answer also appears in the sentence");
    if(cfg.code!=="sr"&&x.answer.some(cyr))p.push("answer has Cyrillic");}
  if(k==="form"){if(!x.lemma)p.push("form needs lemma");else if(Array.isArray(x.answer)&&x.answer.some(a=>N(a)===N(x.lemma)))p.push("form: answer must differ from the lemma");}
  if(k==="word"){if(!x.clue_en||!x.clue_ru)p.push("word needs clue_en and clue_ru");if(!x.ref||!vset.has(String(x.ref).toLowerCase()))p.push("word: ref must be an \"en\" entry of vocab-"+lvl+".json");}
  if(k==="grammar"){if(!x.section||!gset.has(x.section))p.push("grammar: section must be a section id of grammar-"+lvl+".json");}
  if(x.clue_en&&cyr(x.clue_en))p.push("clue_en has Cyrillic");if(x.clue_ru&&!cyr(x.clue_ru))p.push("clue_ru must be Russian");
  if(!isEN&&(!x.tr_en||cyr(x.tr_en)))p.push("tr_en (English sentence translation) missing or Cyrillic");if(!x.tr_ru||!cyr(x.tr_ru))p.push("tr_ru (Russian translation) missing or not Russian");
  if(!x.explain_en||cyr(x.explain_en))p.push("explain_en missing or Cyrillic");if(!x.explain_ru||!cyr(x.explain_ru))p.push("explain_ru missing or not Russian");
  if(all.some(y=>y!==x&&N(y.text)===N(x.text)))p.push("duplicate sentence");return p;}
let P=load(pf);
if(cmd==="add"){const add=JSON.parse(fs.readFileSync(file,"utf8"));const ok=[],bad=[];for(const x of add){const pr=problems(x,P.concat(ok));if(pr.length)bad.push((x.text||"?")+"\n      → "+pr.join("; "));else ok.push(x);}
  P=P.concat(ok);P.forEach((x,i)=>x.id="g"+String(i+1).padStart(3,"0"));fs.writeFileSync(pf,JSON.stringify(P,null,1));console.log("added "+ok.length+(bad.length?", REJECTED "+bad.length+":\n  - "+bad.join("\n  - "):""));}
const c={form:0,word:0,grammar:0};const errs=[];P.forEach((x,i)=>{c[x.kind]=(c[x.kind]||0)+1;const pr=problems(x,P);if(pr.length)errs.push(i+": "+pr.join("; "));});
console.log(lvl+": "+P.length+" items (form "+c.form+", word "+c.word+", grammar "+c.grammar+")");if(errs.length)console.log("ERRORS:\n  "+errs.slice(0,30).join("\n  "));
else if(c.form>=40&&c.word>=40&&c.grammar>=40)console.log("OK");else console.log("need 40 of each kind");
