// Validates packs/vocab-<LEVEL>.json of a Steps app: node packs/vcheck.js B1
const fs=require("fs"),path=require("path");const lvl=process.argv[2];const f=path.join(__dirname,"vocab-"+lvl+".json");
const LV=["A1","A2","B1","B2","C1","C2"];
let a;try{a=JSON.parse(fs.readFileSync(f,"utf8"));}catch(e){console.log("cannot parse "+f+": "+e.message);process.exit(2);}
const POS=new Set(["noun","verb","adjective","adverb","phrase","number","pronoun","preposition","conjunction","interjection","determiner"]);
const lower=new Map();for(const l of LV.slice(0,LV.indexOf(lvl))){const p=path.join(__dirname,"vocab-"+l+".json");if(fs.existsSync(p))try{for(const e of JSON.parse(fs.readFileSync(p,"utf8")))lower.set(String(e.en).toLowerCase().trim(),l);}catch(e){}}
const errs=[];const seen=new Set();const topics={};const cyr=s=>/[Ѐ-ӿ]/.test(String(s||""));
if(!Array.isArray(a))errs.push("not an array");
(a||[]).forEach((e,i)=>{const w="item "+i+" ("+(e&&e.en)+")";if(!e||typeof e!=="object")return errs.push(w+": not an object");
  for(const k of ["en","ru","ipa","pos","topic","def","example","example_ru"])if(!e[k]||typeof e[k]!=="string")errs.push(w+": missing "+k);
  if(e.pos&&!POS.has(e.pos))errs.push(w+": bad pos "+e.pos);const key=String(e.en||"").toLowerCase().trim();if(seen.has(key))errs.push(w+": duplicate en");seen.add(key);
  if(lower.has(key))errs.push(w+": already in level "+lower.get(key)+" — replace with a different word");
  if(e.ru&&!cyr(e.ru))errs.push(w+": ru is not Cyrillic");if(e.example_ru&&!cyr(e.example_ru))errs.push(w+": example_ru is not Cyrillic");
  if(e.ipa&&/[\/\[\]]/.test(e.ipa))errs.push(w+": ipa must have no slashes/brackets");
  if(e.alt!==undefined&&e.alt!==null&&!cyr(e.alt))errs.push(w+": alt must be Cyrillic");
  if(e.def&&cyr(e.def))errs.push(w+": def must be in the target language, not Russian");
  if(e.topic)topics[e.topic]=(topics[e.topic]||0)+1;});
const tl=Object.keys(topics);console.log(lvl+": "+(a||[]).length+" items, "+tl.length+" topics, verbs "+(a||[]).filter(e=>e.pos==="verb").length+", with forms "+(a||[]).filter(e=>e.forms).length+", notes "+(a||[]).filter(e=>e.note_ru).length);
for(const t of tl)console.log("  "+String(topics[t]).padStart(3)+"  "+t);
if(tl.length<20)errs.push("expected at least 20 topics, have "+tl.length);for(const t of tl)if(topics[t]<23||topics[t]>27)errs.push("topic '"+t+"' has "+topics[t]+" (want 25)");
if(!tl.some(t=>/phrasal verbs|verbs with prepositions/i.test(t)))errs.push("no phrasal-verb topic (name it 'Phrasal verbs …' or 'Verbs with prepositions …')");
if(!tl.some(t=>/idiom|expressions/i.test(t)))errs.push("no idioms topic (name it 'Idioms & expressions …')");
if((a||[]).length<480)errs.push("expected about 500 items, have "+(a||[]).length);
if(errs.length){console.log("ERRORS ("+errs.length+"):");errs.slice(0,50).forEach(e=>console.log("  - "+e));process.exit(2);}else console.log("OK");
