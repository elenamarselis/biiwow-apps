const fs=require("fs"),path=require("path");const lvl=process.argv[2];const f=path.join(__dirname,"grammar-"+lvl+".json");
let g;try{g=JSON.parse(fs.readFileSync(f,"utf8"));}catch(e){console.log("cannot parse "+f+": "+e.message);process.exit(2);}
const errs=[];const TYPES=new Set(["mc","fill","order","tf","match"]);const cyr=s=>/[Ѐ-ӿ]/.test(String(s||""));
if(g.level!==lvl)errs.push("level field should be "+lvl);if(!Array.isArray(g.sections)||g.sections.length<8)errs.push("need >=8 sections");
const ids=new Set();let tr=0,te=0;const byType={};
for(const s of g.sections||[]){const w="section "+(s.id||"?");if(!s.id||!/^[a-z0-9-]+$/.test(s.id))errs.push(w+": bad id");if(ids.has(s.id))errs.push(w+": dup id");ids.add(s.id);
  for(const k of ["title_en","title_ru","summary_en","summary_ru"])if(!s[k])errs.push(w+": missing "+k);if(!cyr(s.title_ru)||!cyr(s.summary_ru))errs.push(w+": title_ru/summary_ru not Cyrillic");
  if(!Array.isArray(s.rules)||s.rules.length<5)errs.push(w+": need >=5 rules");
  for(const r of s.rules||[]){tr++;for(const k of ["title_en","title_ru","body_en","body_ru"])if(!r[k])errs.push(w+": rule missing "+k);if(!cyr(r.body_ru))errs.push(w+": body_ru not Cyrillic in '"+r.title_en+"'");if(r.body_en&&r.body_en.length>900)errs.push(w+": body_en too long");if(!Array.isArray(r.examples)||!r.examples.length)errs.push(w+": rule '"+r.title_en+"' needs examples");for(const ex of r.examples||[])if(!ex.en||!ex.ru)errs.push(w+": example missing en/ru in '"+r.title_en+"'");}
  if(!Array.isArray(s.exercises)||s.exercises.length<20)errs.push(w+": need >=20 exercises");const eids=new Set();
  for(const e of s.exercises||[]){te++;const ew=w+" "+(e.id||"?");if(!e.id)errs.push(ew+": no id");if(eids.has(e.id))errs.push(ew+": dup id");eids.add(e.id);if(!TYPES.has(e.type)){errs.push(ew+": bad type");continue;}byType[e.type]=(byType[e.type]||0)+1;
    if(e.type!=="order"&&e.type!=="match"){if(!e.explain_en||!e.explain_ru)errs.push(ew+": needs explain_en and explain_ru");else if(!cyr(e.explain_ru))errs.push(ew+": explain_ru not Cyrillic");}
    if(e.type==="mc"){if(!e.q||!Array.isArray(e.options)||e.options.length<3||e.options.length>5)errs.push(ew+": mc needs q and 3-5 options");else if(!Number.isInteger(e.answer)||e.answer<0||e.answer>=e.options.length)errs.push(ew+": mc answer out of range");else if(new Set(e.options.map(o=>String(o).trim().toLowerCase())).size!==e.options.length)errs.push(ew+": dup options");}
    if(e.type==="fill"){if(!e.q||!e.q.includes("___"))errs.push(ew+": fill needs ___");if(!Array.isArray(e.answer)||!e.answer.length)errs.push(ew+": fill answer array");}
    if(e.type==="order"){if(!Array.isArray(e.words)||e.words.length<3||!e.answer)errs.push(ew+": order needs words+answer");else{const k=x=>x.slice().sort().join("\u0001");if(k(e.answer.split(/\s+/).filter(Boolean))!==k(e.words.map(String)))errs.push(ew+": words do not match answer");}if(!e.ru||!cyr(e.ru))errs.push(ew+": order needs ru");}
    if(e.type==="tf"){if(!e.q||typeof e.answer!=="boolean")errs.push(ew+": tf needs q + boolean");}
    if(e.type==="match"){if(!Array.isArray(e.pairs)||e.pairs.length<3||e.pairs.length>6||!e.pairs.every(p=>Array.isArray(p)&&p.length===2&&p[0]&&p[1]))errs.push(ew+": match 3-6 pairs");else if(new Set(e.pairs.map(p=>p[1])).size!==e.pairs.length)errs.push(ew+": right values must be distinct");}
  }}
console.log(lvl+": "+(g.sections||[]).length+" sections, "+tr+" rules, "+te+" exercises "+JSON.stringify(byType));for(const s of g.sections||[])console.log("  "+String((s.exercises||[]).length).padStart(3)+" ex  "+String((s.rules||[]).length).padStart(2)+" rules  "+s.id+" — "+s.title_en);
if(errs.length){console.log("ERRORS ("+errs.length+"):");errs.slice(0,50).forEach(e=>console.log("  - "+e));process.exit(2);}
