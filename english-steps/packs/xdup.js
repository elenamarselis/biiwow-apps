// Cross-file duplicate check across add-*.json files (case-insensitive on "en"). Lower level keeps the word; higher/later file must replace it.
const fs=require("fs"),path=require("path");const dir=__dirname;const files=fs.readdirSync(dir).filter(f=>/^addx?-([ABC][12])(-\d)?\.json$/.test(f)).sort();
const owner={};const dups={};
for(const f of files){for(const e of JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"))){const k=e.en.toLowerCase().trim();if(owner[k]&&owner[k]!==f){(dups[f]=dups[f]||[]).push(k+" (also in "+owner[k]+")");}else owner[k]=owner[k]||f;}}
for(const f of files)console.log(f+": "+((dups[f]||[]).length)+" duplicates"+((dups[f]||[]).length?"\n   - "+dups[f].join("\n   - "):""));
