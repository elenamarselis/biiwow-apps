const fs=require("fs"),path=require("path");const lvl=process.argv[2];const f=path.join(__dirname,"vocab-"+lvl+".json");
let a;try{a=JSON.parse(fs.readFileSync(f,"utf8"));}catch(e){console.log("cannot parse "+f+": "+e.message);process.exit(2);}
const POS=new Set(["noun","verb","adjective","adverb","phrase","number","pronoun","preposition","conjunction","interjection","determiner"]);
const errs=[];const seen=new Set();const topics={};
if(!Array.isArray(a))errs.push("not an array");
(a||[]).forEach((e,i)=>{const w="item "+i+" ("+(e&&e.en)+")";if(!e||typeof e!=="object")return errs.push(w+": not an object");for(const k of ["en","ru","ipa","pos","topic","def","example","example_ru"])if(!e[k]||typeof e[k]!=="string")errs.push(w+": missing "+k);
  if(e.pos&&!POS.has(e.pos))errs.push(w+": bad pos "+e.pos);const key=String(e.en||"").toLowerCase().trim();if(seen.has(key))errs.push(w+": duplicate en");seen.add(key);
  if(e.ru&&!/[Ѐ-ӿ]/.test(e.ru))errs.push(w+": ru is not Cyrillic");if(e.example_ru&&!/[Ѐ-ӿ]/.test(e.example_ru))errs.push(w+": example_ru is not Cyrillic");
  if(e.topic)topics[e.topic]=(topics[e.topic]||0)+1;});
const tl=Object.keys(topics);console.log(lvl+": "+(a||[]).length+" items, "+tl.length+" topics, verbs "+(a||[]).filter(e=>e.pos==="verb").length+", with forms "+(a||[]).filter(e=>e.forms).length+", notes "+(a||[]).filter(e=>e.note_ru).length);
for(const t of tl)console.log("  "+String(topics[t]).padStart(3)+"  "+t);
if(tl.length<20)errs.push("expected at least 20 topics, have "+tl.length);for(const t of tl)if(topics[t]<23||topics[t]>27)errs.push("topic '"+t+"' has "+topics[t]+" (want 25)");
if(errs.length){console.log("ERRORS ("+errs.length+"):");errs.slice(0,40).forEach(e=>console.log("  - "+e));process.exit(2);}
