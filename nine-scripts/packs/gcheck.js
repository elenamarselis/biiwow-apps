// Usage: node packs/gcheck.js <lang>  — validates packs/grammar-<lang>.json
const fs=require("fs"),path=require("path");const lang=process.argv[2];const f=path.join(__dirname,"grammar-"+lang+".json");
let g;try{g=JSON.parse(fs.readFileSync(f,"utf8"));}catch(e){console.log("cannot parse "+f+": "+e.message);process.exit(2);}
const errs=[];const TYPES=new Set(["mc","fill","order","tf","match"]);
if(g.lang!==lang)errs.push("lang field should be "+lang);
if(!Array.isArray(g.sections)||g.sections.length<8)errs.push("need at least 8 sections, have "+(g.sections||[]).length);
const ids=new Set();let totalEx=0,totalRules=0;const byType={};
for(const s of g.sections||[]){const w="section "+(s.id||"?");if(!s.id||!/^[a-z0-9-]+$/.test(s.id))errs.push(w+": bad id");if(ids.has(s.id))errs.push(w+": duplicate id");ids.add(s.id);
  if(!s.title||!s.summary)errs.push(w+": missing title/summary");if(![1,2,3].includes(s.level))errs.push(w+": level must be 1-3");
  if(!Array.isArray(s.rules)||s.rules.length<5)errs.push(w+": need >=5 rules, have "+(s.rules||[]).length);
  for(const r of s.rules||[]){totalRules++;if(!r.title||!r.body)errs.push(w+": rule missing title/body");if(r.body&&r.body.length>900)errs.push(w+": rule '"+r.title+"' body too long");if(!Array.isArray(r.examples)||r.examples.length<1)errs.push(w+": rule '"+r.title+"' needs examples");for(const ex of r.examples||[])if(!ex.target||!ex.en)errs.push(w+": example missing target/en in '"+r.title+"'");}
  if(!Array.isArray(s.exercises)||s.exercises.length<20)errs.push(w+": need >=20 exercises, have "+(s.exercises||[]).length);
  const eids=new Set();
  for(const e of s.exercises||[]){totalEx++;const ew=w+" exercise "+(e.id||"?");if(!e.id)errs.push(ew+": missing id");if(eids.has(e.id))errs.push(ew+": duplicate id");eids.add(e.id);if(!TYPES.has(e.type)){errs.push(ew+": bad type "+e.type);continue;}byType[e.type]=(byType[e.type]||0)+1;
    if(e.type==="mc"){if(!e.q||!Array.isArray(e.options)||e.options.length<3||e.options.length>5)errs.push(ew+": mc needs q and 3-5 options");else if(!Number.isInteger(e.answer)||e.answer<0||e.answer>=e.options.length)errs.push(ew+": mc answer index out of range");else if(new Set(e.options.map(o=>String(o).trim().toLowerCase())).size!==e.options.length)errs.push(ew+": mc duplicate options");}
    if(e.type==="fill"){if(!e.q||!e.q.includes("___"))errs.push(ew+": fill q needs ___");if(!Array.isArray(e.answer)||!e.answer.length||!e.answer.every(a=>typeof a==="string"&&a.trim()))errs.push(ew+": fill answer must be a non-empty array of strings");}
    if(e.type==="order"){if(!Array.isArray(e.words)||e.words.length<3||!e.answer)errs.push(ew+": order needs >=3 words and answer");else{const a=e.answer.split(/\s+/).filter(Boolean);const ws=e.words.map(String);const k=x=>x.slice().sort().join("\u0001");if(k(a)!==k(ws))errs.push(ew+": order words do not match answer: ["+ws.join(" ")+"] vs '"+e.answer+"'");}}
    if(e.type==="tf"){if(!e.q||typeof e.answer!=="boolean")errs.push(ew+": tf needs q and boolean answer");}
    if(e.type==="match"){if(!Array.isArray(e.pairs)||e.pairs.length<3||e.pairs.length>6||!e.pairs.every(p=>Array.isArray(p)&&p.length===2&&p[0]&&p[1]))errs.push(ew+": match needs 3-6 [a,b] pairs");else if(new Set(e.pairs.map(p=>p[1])).size!==e.pairs.length)errs.push(ew+": match right-hand values must be distinct");}
  }}
console.log(lang+": "+(g.sections||[]).length+" sections, "+totalRules+" rules, "+totalEx+" exercises "+JSON.stringify(byType));
for(const s of g.sections||[])console.log("  L"+s.level+"  "+String((s.exercises||[]).length).padStart(3)+" ex  "+String((s.rules||[]).length).padStart(2)+" rules  "+s.id+" — "+s.title);
if(errs.length){console.log("ERRORS ("+errs.length+"):");errs.slice(0,50).forEach(e=>console.log("  - "+e));process.exit(2);}
