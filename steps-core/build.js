// Builds one "Steps" app: node steps-core/build.js <app-dir>
// <app-dir>/config.json chooses the language; steps-core/src holds the shared app code.
const fs=require("fs"),path=require("path");
const core=__dirname,app=path.resolve(process.argv[2]||".");
const cfg=JSON.parse(fs.readFileSync(path.join(app,"config.json"),"utf8"));
const read=f=>fs.readFileSync(path.join(core,"src",f),"utf8");
const head=read("head.html").replace("<title>Biiwow English Steps</title>","<title>Biiwow "+cfg.appName+"</title>");
const body=read("body.html").replace("__APPNAME__",cfg.appName);
const conf='<script>window.STEPS='+JSON.stringify({code:cfg.code,bcp:cfg.bcp,appName:cfg.appName,levels:cfg.levels,en:cfg.en,ru:cfg.ru})+';</script>\n';
const js=conf+read("app1.js")+read("app2.js");
const inner=head+body+js;
fs.writeFileSync(path.join(app,"preview.html"),inner);
const site=path.join(app,"site");fs.mkdirSync(path.join(site,"packs"),{recursive:true});fs.mkdirSync(path.join(site,"icons"),{recursive:true});
const full='<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<meta name="theme-color" content="#fa712d" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#1a1a1e" media="(prefers-color-scheme: dark)">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="'+cfg.appName+'">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n<link rel="icon" href="icons/icon-192.png">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>\n'+head+'</head>\n<body>\n'+body+js+'\n<script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(site,"index.html"),full);
fs.writeFileSync(path.join(site,"manifest.webmanifest"),JSON.stringify({name:"Biiwow "+cfg.appName,short_name:cfg.appName,description:cfg.description,start_url:"./index.html",scope:"./",display:"standalone",orientation:"portrait",background_color:"#fdfaf5",theme_color:"#fa712d",lang:"ru",icons:[{src:"icons/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"icons/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},{src:"icons/icon-maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]},null,1));
const V=String(Date.now());
fs.writeFileSync(path.join(site,"sw.js"),`const V="${cfg.code}-steps-${V}";const SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.includes("/api/"))return;
  if(u.pathname.includes("/packs/")){e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r;}));return;}
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(h=>h||caches.match("index.html"))));});`);
fs.copyFileSync(path.join(core,"worker.js"),path.join(site,"_worker.js"));
for(const f of fs.readdirSync(path.join(core,"icons")))fs.copyFileSync(path.join(core,"icons",f),path.join(site,"icons",f));
let n=0;const packs=path.join(app,"packs");for(const f of fs.readdirSync(packs))if(/^(vocab|grammar)-[ABC][12]\.json$/.test(f)){fs.copyFileSync(path.join(packs,f),path.join(site,"packs",f));n++;}
console.log(cfg.appName+": preview.html "+(inner.length/1024).toFixed(0)+" KB; site/index.html "+(full.length/1024).toFixed(0)+" KB; packs copied: "+n);
