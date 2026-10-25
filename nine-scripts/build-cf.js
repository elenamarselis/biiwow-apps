// Builds the Cloudflare Pages site: full HTML document + PWA manifest + service worker + packs + functions.
const fs=require("fs"),path=require("path");
const inner=fs.readFileSync("index.html","utf8"); // artifact build (no skeleton)
const VERSION=String(Date.now());
const head='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<meta name="theme-color" content="#fa712d" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#1a1a1e" media="(prefers-color-scheme: dark)">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<meta name="apple-mobile-web-app-title" content="Nine Scripts">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>\n<script>window.NS_CLOUD=true;</script>\n';
const tail='\n<script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>\n</body>\n</html>\n';
let doc=inner.replace("<title>Nine Scripts</title>","<title>Biiwow · Nine Scripts</title>");
const html=head+doc.replace(/^([\s\S]*?<\/style>)/,"$1</head>\n<body>")+tail;
fs.mkdirSync("site/packs",{recursive:true});fs.mkdirSync("site/icons",{recursive:true});
fs.writeFileSync("site/index.html",html);
for(const f of fs.readdirSync("packs"))if(f.endsWith(".json"))fs.copyFileSync(path.join("packs",f),path.join("site/packs",f));
fs.writeFileSync("site/manifest.webmanifest",JSON.stringify({name:"Biiwow Nine Scripts",short_name:"Nine Scripts",description:"Vocabulary, grammar and games for fourteen languages.",start_url:"./index.html",scope:"./",display:"standalone",orientation:"portrait",background_color:"#fdfaf5",theme_color:"#fa712d",lang:"en",icons:[{src:"icons/icon-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"icons/icon-512.png",sizes:"512x512",type:"image/png",purpose:"any"},{src:"icons/icon-maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]},null,1));
const packs=fs.readdirSync("site/packs").map(f=>"packs/"+f);
fs.writeFileSync("site/sw.js",`// Nine Scripts service worker: app shell cached on install, packs cached on first use, API never cached.
const V="ns-${VERSION}";const SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.includes("/api/"))return;
  if(u.pathname.includes("/packs/")){e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r;}));return;}
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(h=>h||caches.match("index.html"))));});`);
console.log("site/index.html",(html.length/1024).toFixed(0),"KB; packs:",packs.length);
