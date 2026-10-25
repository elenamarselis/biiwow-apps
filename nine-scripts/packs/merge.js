// Usage: node packs/merge.js <lang>   — merges packs/<lang>.part*.json into packs/<lang>.json, validating.
const fs=require("fs"),path=require("path");
const lang=process.argv[2];if(!lang){console.error("lang?");process.exit(1);}
const dir=__dirname;const TOPICS_EN=["Phrasal verbs: everyday life","Phrasal verbs: work & business","Idioms & fixed expressions","Formal & academic vocabulary","Describing people & character","Emotions & attitudes","Argument, debate & persuasion","Business, money & finance","Law, politics & society","Science & technology","Literature, media & the arts","Near-synonyms & nuance","Collocations that sound native","Latin & Greek roots","Adverbs & discourse markers","Humour, irony & register","Food, travel & lifestyle","Nature, environment & weather","Health, body & medicine","Rare but useful words"];
const TOPICS_STD=["Greetings & politeness","Numbers & counting","Family & people","Food & drink","At the café and restaurant","Travel & directions","Transport","Time, days & months","Colours & shapes","Body & health","At home","Clothes","Work & study","Weather & nature","Shopping & money","Feelings","Verbs of daily life","Question words & small words","Adjectives for describing","City & places"];
const TOPICS=lang==="en"?TOPICS_EN:TOPICS_STD;
const POS=new Set(["noun","verb","adjective","adverb","phrase","number","pronoun","preposition","conjunction","interjection","particle"]);
const LATIN=new Set(["pl","hu","fi","no","tr","it","es","fr","nl","en"]);
const files=fs.readdirSync(dir).filter(f=>f.startsWith(lang+".part")&&f.endsWith(".json")).sort();
if(!files.length){console.error("no part files for",lang);process.exit(1);}
let all=[],errors=[];
for(const f of files){try{const a=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));if(!Array.isArray(a))throw new Error("not an array");all.push(...a);}catch(e){errors.push(f+": "+e.message);}}
let starter=[];try{starter=JSON.parse(fs.readFileSync(path.join(dir,"..","starter-pack.json"),"utf8")).filter(s=>s.lang===lang).map(s=>s.target.toLowerCase());}catch(e){}
const norm=s=>String(s||"").toLowerCase().normalize("NFC").trim();
const seen=new Set(starter.map(norm));const out=[];const perTopic={};
all.forEach((e,i)=>{const where="item "+i+" ("+(e&&e.target)+")";
  if(!e||typeof e!=="object"){errors.push(where+": not an object");return;}
  for(const k of ["en","target","topic","pos"])if(!e[k]||typeof e[k]!=="string"){errors.push(where+": missing "+k);return;}
  if(!TOPICS.includes(e.topic)){errors.push(where+": bad topic '"+e.topic+"'");return;}
  if(!POS.has(e.pos)){errors.push(where+": bad pos '"+e.pos+"'");return;}
  const key=norm(e.target);if(seen.has(key)){errors.push(where+": duplicate target");return;}seen.add(key);
  if(LATIN.has(lang))e.roman=null;else if(!e.roman){errors.push(where+": roman required for "+lang);return;}
  if(e.gender&&!(e.gender.m&&e.gender.f&&e.gender.m.target&&e.gender.f.target)){errors.push(where+": bad gender");return;}
  if(e.conj&&(!Array.isArray(e.conj)||!e.conj.every(c=>c&&c.label&&c.target))){errors.push(where+": bad conj");return;}
  if(e.example&&!(e.example.target&&e.example.en)){errors.push(where+": bad example");return;}
  if(e.note&&e.note.length>320){errors.push(where+": note too long ("+e.note.length+")");}
  perTopic[e.topic]=(perTopic[e.topic]||0)+1;
  out.push({id:"",type:e.type==="phrase"?"phrase":"word",topic:e.topic,en:e.en.trim(),target:e.target.trim(),roman:e.roman||null,literal:e.literal||null,note:e.note||null,pos:e.pos,gender:e.gender||null,conj:e.conj||null,example:e.example||null});});
out.forEach((e,i)=>e.id="p_"+lang+"_"+String(i+1).padStart(3,"0"));
fs.writeFileSync(path.join(dir,lang+".json"),JSON.stringify(out));
console.log(lang+": "+out.length+" items written to packs/"+lang+".json");
for(const t of TOPICS)console.log("  "+String(perTopic[t]||0).padStart(3)+"  "+t);
console.log("verbs with conj:",out.filter(e=>e.conj).length,"| gender pairs:",out.filter(e=>e.gender).length,"| examples:",out.filter(e=>e.example).length,"| notes:",out.filter(e=>e.note).length);
if(errors.length){console.log("ERRORS ("+errors.length+"):");errors.slice(0,40).forEach(e=>console.log("  - "+e));process.exit(2);}
