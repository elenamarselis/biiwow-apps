// Cloudflare Pages advanced-mode worker (_worker.js): the progress API on /api/store/<name>, everything else served from the static files.
// Bind a KV namespace to the Pages project as PROGRESS. The client sends "x-profile-key": a hash of email+password.
// Storage: {"__auth": "<key or empty>", "doc": {...}}. Older values without the envelope are read as unprotected and wrapped on the next write.
const SENTRY_DSN="https://6877e7860f22d6b54ad1357100a123e3@o4511919825682432.ingest.de.sentry.io/4512318299242576";
function sentryReport(err,request){try{const m=/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(SENTRY_DSN);if(!m)return;const [,key,host,pid]=m;const id=crypto.randomUUID().replace(/-/g,"");const now=new Date().toISOString();
  const ev={event_id:id,timestamp:now,platform:"javascript",level:"error",logger:"worker",request:{url:request.url,method:request.method},exception:{values:[{type:(err&&err.name)||"Error",value:String((err&&err.message)||err),stacktrace:err&&err.stack?{frames:[{function:err.stack.split("\n")[1]||"worker"}]}:undefined}]}};
  const body=JSON.stringify({event_id:id,sent_at:now,dsn:SENTRY_DSN})+"\n"+JSON.stringify({type:"event"})+"\n"+JSON.stringify(ev);
  return fetch("https://"+host+"/api/"+pid+"/envelope/",{method:"POST",headers:{"Content-Type":"application/x-sentry-envelope","X-Sentry-Auth":"Sentry sentry_version=7, sentry_client=biiwow-worker/1.0, sentry_key="+key},body});}catch(e){}}
const PREFIX="ninescripts:";
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const keyOf=name=>PREFIX+decodeURIComponent(name||"").trim().toLowerCase().replace(/\s+/g," ").slice(0,80);
const readKey=request=>(request.headers.get("x-profile-key")||"").slice(0,128);
function unwrap(raw){try{const v=JSON.parse(raw);if(v&&typeof v==="object"&&"doc" in v&&"__auth" in v)return {auth:v.__auth||"",doc:v.doc};return {auth:"",doc:v};}catch(e){return null;}}
async function get(request,name,env){
  if(!env.PROGRESS)return json({error:"KV namespace PROGRESS is not bound"},503);
  const raw=await env.PROGRESS.get(keyOf(name));if(raw==null)return json(null,404);
  const v=unwrap(raw);if(!v)return json({error:"corrupt"},500);
  if(v.auth&&v.auth!==readKey(request))return json({error:"wrong key"},401);
  return new Response(JSON.stringify(v.doc),{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
async function save(request,name,env){
  if(!env.PROGRESS)return json({error:"KV namespace PROGRESS is not bound"},503);
  const body=await request.text();if(body.length>20_000_000)return json({error:"too large"},413);
  let doc;try{doc=JSON.parse(body);}catch(e){return json({error:"invalid JSON"},400);}
  if(!doc||typeof doc!=="object"||Array.isArray(doc))return json({error:"expected an object"},400);
  const key=keyOf(name);const mine=readKey(request);
  const existing=await env.PROGRESS.get(key);if(existing!=null){const v=unwrap(existing);if(v&&v.auth&&v.auth!==mine)return json({error:"wrong key"},401);}
  await env.PROGRESS.put(key,JSON.stringify({__auth:mine,doc}));
  return json({ok:true,updatedAt:doc.updatedAt||null});
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);const m=url.pathname.match(/^\/api\/store\/([^\/]+)\/?$/);
    if(m){const name=m[1];try{if(request.method==="GET")return await get(request,name,env);if(request.method==="PUT"||request.method==="POST")return await save(request,name,env);return json({error:"method"},405);}
      catch(err){const p=sentryReport(err,request);if(p&&ctx)ctx.waitUntil(p);return json({error:"server error"},500);}}
    return env.ASSETS.fetch(request);
  }
};
