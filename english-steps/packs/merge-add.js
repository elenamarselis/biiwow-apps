// Appends validated add-*.json files to the level packs, skipping any word already present (case-insensitive).
const fs=require("fs"),path=require("path");const dir=__dirname;const added={};
for(const f of fs.readdirSync(dir).filter(f=>/^addx?-([ABC][12])(-\d)?\.json$/.test(f)).sort()){
  const lvl=f.match(/^addx?-([ABC][12])/)[1];const packF=path.join(dir,"vocab-"+lvl+".json");const pack=JSON.parse(fs.readFileSync(packF,"utf8"));
  const have=new Set(pack.map(e=>e.en.toLowerCase().trim()));let n=0,skip=0;
  for(const e of JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"))){const k=e.en.toLowerCase().trim();if(have.has(k)){skip++;continue;}have.add(k);pack.push(e);n++;}
  fs.writeFileSync(packF,JSON.stringify(pack));added[lvl]=(added[lvl]||0)+n;console.log(f+": added "+n+", skipped duplicates "+skip+" → "+lvl+" now "+pack.length);
}
console.log(added);
