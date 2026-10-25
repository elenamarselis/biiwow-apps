// Validates an add-on vocabulary file: node packs/vcheck-add.js packs/add-B2-1.json "Topic A|Topic B|..."
const fs=require("fs"),path=require("path");const f=process.argv[2];const want=(process.argv[3]||"").split("|").filter(Boolean);
let a;try{a=JSON.parse(fs.readFileSync(f,"utf8"));}catch(e){console.log("cannot parse "+f+": "+e.message);process.exit(2);}
const existing=new Set(fs.readFileSync(path.join(__dirname,"existing-en.txt"),"utf8").split("\n").map(l=>l.split("\t")[1]).filter(Boolean).map(s=>s.toLowerCase().trim()));
// Words already claimed by add-on files that come earlier in sorted order (A1 < A2 < B1-1 < ... ) are also taken.
const me=path.basename(f);for(const g of fs.readdirSync(__dirname).filter(x=>/^addx?-([ABC][12])(-\d)?\.json$/.test(x)).sort()){if(g>=me)continue;try{for(const e of JSON.parse(fs.readFileSync(path.join(__dirname,g),"utf8")))existing.add(String(e.en).toLowerCase().trim());}catch(e){}}
const POS=new Set(["noun","verb","adjective","adverb","phrase","number","pronoun","preposition","conjunction","interjection","determiner"]);
const errs=[];const seen=new Set();const topics={};
if(!Array.isArray(a))errs.push("not an array");
(a||[]).forEach((e,i)=>{const w="item "+i+" ("+(e&&e.en)+")";if(!e||typeof e!=="object")return errs.push(w+": not an object");for(const k of ["en","ru","ipa","pos","topic","def","example","example_ru"])if(!e[k]||typeof e[k]!=="string")errs.push(w+": missing "+k);
  if(e.pos&&!POS.has(e.pos))errs.push(w+": bad pos "+e.pos);const key=String(e.en||"").toLowerCase().trim();if(seen.has(key))errs.push(w+": duplicate en in this file");seen.add(key);if(existing.has(key))errs.push(w+": already used (in a level pack or an earlier add-on file) — replace with a different word");
  if(e.ru&&!/[Ѐ-ӿ]/.test(e.ru))errs.push(w+": ru is not Cyrillic");if(e.example_ru&&!/[Ѐ-ӿ]/.test(e.example_ru))errs.push(w+": example_ru is not Cyrillic");if(e.ipa&&/[\/\[\]]/.test(e.ipa))errs.push(w+": ipa must have no slashes/brackets");
  if(e.topic)topics[e.topic]=(topics[e.topic]||0)+1;if(e.topic&&want.length&&!want.includes(e.topic))errs.push(w+": topic not in the brief: "+e.topic);});
const tl=Object.keys(topics);console.log(path.basename(f)+": "+(a||[]).length+" items, "+tl.length+" topics, verbs "+(a||[]).filter(e=>e.pos==="verb").length+", with forms "+(a||[]).filter(e=>e.forms).length+", notes "+(a||[]).filter(e=>e.note_ru).length);
for(const t of tl)console.log("  "+String(topics[t]).padStart(3)+"  "+t);
for(const t of want)if(!topics[t])errs.push("topic missing: "+t);for(const t of tl)if(topics[t]!==25)errs.push("topic '"+t+"' has "+topics[t]+" (want exactly 25)");
if(errs.length){console.log("ERRORS ("+errs.length+"):");errs.slice(0,60).forEach(e=>console.log("  - "+e));process.exit(2);}else console.log("OK");
