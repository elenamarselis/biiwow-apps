// Adds German, Dutch and Portuguese Steps to the Languages page (cards after French Steps, counts in the intro and meta description).
const fs=require("fs");
const p=process.argv[2]||"/home/user/biiwow-languages/site/index.html";let s=fs.readFileSync(p,"utf8");
const card=(name,slug,desc)=>`  <article class="card">
    <div class="top"><h3>${name}</h3><span class="badge">Free</span></div>
    <div class="meta"><span class="tag">A1 → C2</span><span class="tag">3,000 words (500 per level)</span><span class="tag">60 grammar chapters</span><span class="tag">RU / EN</span></div>
    <p>${desc}</p>
    <a class="btn" href="https://${slug}.pages.dev">Open ${name}</a>
  </article>
`;
const de=card("German Steps","biiwow-german-steps","German from A1 to C2: nouns with der/die/das and plural, verbs with their past forms and separable prefixes, verbs with prepositions and idioms in their own chapters, and grammar from cases and word order to Konjunktiv and modal particles, all with exercises and Russian explanations.");
const nl=card("Dutch Steps","biiwow-dutch-steps","Dutch from A1 to C2: nouns with de/het, plural and diminutive, verbs with their past forms, verbs with prepositions and idioms in their own chapters, and grammar from word order and er to verb clusters and Flemish differences, all with exercises and Russian explanations.");
const pt=card("Portuguese Steps","biiwow-portuguese-steps","European Portuguese from A1 to C2, with Brazilian differences marked: nouns with their article, irregular verbs with key forms, verbs with prepositions and idioms in their own chapters, and grammar from ser/estar to the conjuntivo and personal infinitive, all with exercises and Russian explanations.");
if(!s.includes("<h3>German Steps</h3>")){
  const anchor='  <article class="card">\n    <div class="top"><h3>Nine Scripts</h3>';
  if(!s.includes(anchor))throw new Error("Nine Scripts card anchor not found");
  s=s.replace(anchor,de+nl+pt+anchor);
}
s=s.replace("English, Serbian, Hungarian, Spanish, Italian and French Steps, Nine Scripts,","English, Serbian, Hungarian, Spanish, Italian, French, German, Dutch and Portuguese Steps, Nine Scripts,");
s=s.replace('<p class="lead">Seven apps for words','<p class="lead">Ten apps for words');
fs.writeFileSync(p,s);
console.log("cards:",(s.match(/<article class="card">/g)||[]).length,"| lead ten:",s.includes("Ten apps"),"| meta:",s.includes("German, Dutch and Portuguese Steps"));
