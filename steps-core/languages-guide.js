// Puts the shared install guide (install-guide.js) into the Languages page, plus a section with a button that reopens it. Safe to re-run.
const fs=require("fs"),path=require("path");
const p=process.argv[2]||"/home/user/biiwow-languages/site/index.html";let s=fs.readFileSync(p,"utf8");
const guide=fs.readFileSync(path.join(__dirname,"install-guide.js"),"utf8");
const block='<!--bw-install-->\n<script>window.BW_APP_NAME="biiwow Languages";'+guide+'</script>\n<!--/bw-install-->\n';
s=s.replace(/<!--bw-install-->[\s\S]*?<!--\/bw-install-->\n/,"");
s=s.replace("</body>",block+"</body>");
const sec='<h2 id="install">Save the apps on your phone or computer</h2>\n<div class="card"><p>Every app can be added to the home screen of an Android phone or iPhone, or installed on a computer, and then opens like a normal app with the biiwow icon. When you open an app for the first time it asks which device you use and shows the steps. You can see them here too.</p><button class="btn" type="button" style="border:0;font:inherit;font-weight:800;cursor:pointer" onclick="biiwowInstall()">Show me how</button></div>\n\n';
if(!s.includes('id="install"'))s=s.replace("<h2>How progress is saved</h2>",sec+"<h2>How progress is saved</h2>");
fs.writeFileSync(p,s);console.log("guide:",s.includes("biiwowInstall=function"),"| section:",s.includes('id="install"'));
