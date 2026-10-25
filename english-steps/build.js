const fs=require("fs");
const head=fs.readFileSync("src/head.html","utf8"),body=fs.readFileSync("src/body.html","utf8"),js=fs.readFileSync("src/app1.js","utf8")+fs.readFileSync("src/app2.js","utf8");
const inner=head+body+js;
// claude.ai preview (no document skeleton)
fs.writeFileSync("preview.html",inner);
// Cloudflare build: full document
const full='<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<meta name="theme-color" content="#fa712d" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#1a1a1e" media="(prefers-color-scheme: dark)">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="English Steps">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n<link rel="icon" href="icons/icon-192.png">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>\n'+head+'</head>\n<body>\n'+body+js+'\n<script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>\n</body>\n</html>\n';
fs.writeFileSync("site/index.html",full);
console.log("preview.html",(inner.length/1024).toFixed(0),"KB; site/index.html",(full.length/1024).toFixed(0),"KB");

fs.writeFileSync("site/manifest.webmanifest",JSON.stringify({name:"Biiwow English Steps",short_name:"English Steps",description:"English from A1 to C1 for Russian speakers: words, grammar, games.",start_url:"./index.html",scope:"./",display:"standalone",orientation:"portrait",background_color:"#fdfaf5",theme_color:"#fa712d",lang:"ru",icons:[{src:"icons/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"icons/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},{src:"icons/icon-maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]},null,1));
const V=String(Date.now());
fs.writeFileSync("site/sw.js",`const V="es-${V}";const SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.includes("/api/"))return;
  if(u.pathname.includes("/packs/")){e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r;}));return;}
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(h=>h||caches.match("index.html"))));});`);
const path=require("path");fs.mkdirSync("site/packs",{recursive:true});let n=0;for(const f of fs.readdirSync("packs"))if(/^(vocab|grammar)-[ABC][12]\.json$/.test(f)){fs.copyFileSync(path.join("packs",f),path.join("site/packs",f));n++;}console.log("packs copied:",n);
