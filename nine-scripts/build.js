const fs=require("fs");
const starter=fs.readFileSync("starter-pack.json","utf8").trim();
const alph=fs.readFileSync("alphabets.js","utf8");
let js=fs.readFileSync("part2a.js","utf8").replace("/*__STARTER__*/[]",starter).replace("/*__ALPHABETS__*/",alph);
const html=fs.readFileSync("part1.html","utf8")+js+fs.readFileSync("part2b.js","utf8")+fs.readFileSync("part2c.js","utf8");
fs.writeFileSync("index.html",html);
console.log("index.html",(html.length/1024).toFixed(0)+" KB");
