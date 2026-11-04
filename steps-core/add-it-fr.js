// Prepares (does not deploy) the Languages page cards and deploy-workflow jobs for Italian and French Steps.
const fs=require("fs");
// 1) Languages page: two new cards after Spanish Steps, updated counts in the intro and meta description.
const p="/home/user/biiwow-languages/site/index.html";let s=fs.readFileSync(p,"utf8");
const card=(name,slug,desc)=>`  <article class="card">
    <div class="top"><h3>${name}</h3><span class="badge">Free</span></div>
    <div class="meta"><span class="tag">A1 → C2</span><span class="tag">3,000 words (500 per level)</span><span class="tag">60 grammar chapters</span><span class="tag">RU / EN</span></div>
    <p>${desc}</p>
    <a class="btn" href="https://${slug}.pages.dev">Open ${name}</a>
  </article>
`;
const it=card("Italian Steps","biiwow-italian-steps","Italian from A1 to C2: nouns with their article, verbs with their irregular forms and auxiliaries, verb + preposition patterns and idioms in their own chapters, and grammar from essere/avere to the congiuntivo and passato remoto, all with exercises and Russian explanations.");
const fr=card("French Steps","biiwow-french-steps","French from A1 to C2: nouns with their article and gender, verbs with their irregular forms, verb + preposition patterns and idioms in their own chapters, and grammar from être/avoir to the subjonctif and passé simple, all with exercises and Russian explanations.");
if(!s.includes("<h3>Italian Steps</h3>")){
  const anchor='  <article class="card">\n    <div class="top"><h3>Nine Scripts</h3>';
  if(!s.includes(anchor))throw new Error("Nine Scripts card anchor not found");
  s=s.replace(anchor,it+fr+anchor);
}
s=s.replace("Free biiwow language apps: English, Serbian, Hungarian and Spanish Steps, Nine Scripts,","Free biiwow language apps: English, Serbian, Hungarian, Spanish, Italian and French Steps, Nine Scripts,");
s=s.replace("<p class=\"lead\">Five apps for words, grammar and games,","<p class=\"lead\">Seven apps for words, grammar and games,");
fs.writeFileSync(p,s);
console.log("cards:",(s.match(/<article class="card">/g)||[]).length,"| italian:",s.includes("biiwow-italian-steps.pages.dev"),"| french:",s.includes("biiwow-french-steps.pages.dev"));
