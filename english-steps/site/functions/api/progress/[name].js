// Cloudflare Pages Function: GET/PUT /api/<route>/<name> — one JSON document per profile in KV, optionally protected by a key.
// Bind a KV namespace to the Pages project as PROGRESS. The client sends "x-profile-key": a hash of email+password.
// Storage: {"__auth": "<key or empty>", "doc": {...}}. Older values without the envelope are read as unprotected and wrapped on the next write.
const PREFIX="progress:";
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const keyOf=name=>PREFIX+decodeURIComponent(name||"").trim().toLowerCase().replace(/\s+/g," ").slice(0,80);
const readKey=request=>(request.headers.get("x-profile-key")||"").slice(0,128);
function unwrap(raw){try{const v=JSON.parse(raw);if(v&&typeof v==="object"&&"doc" in v&&"__auth" in v)return {auth:v.__auth||"",doc:v.doc};return {auth:"",doc:v};}catch(e){return null;}}
export async function onRequestGet({request,params,env}){
  if(!env.PROGRESS)return json({error:"KV namespace PROGRESS is not bound"},503);
  const raw=await env.PROGRESS.get(keyOf(params.name));if(raw==null)return json(null,404);
  const v=unwrap(raw);if(!v)return json({error:"corrupt"},500);
  if(v.auth&&v.auth!==readKey(request))return json({error:"wrong key"},401);
  return new Response(JSON.stringify(v.doc),{headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
async function save({request,params,env}){
  if(!env.PROGRESS)return json({error:"KV namespace PROGRESS is not bound"},503);
  const body=await request.text();if(body.length>20_000_000)return json({error:"too large"},413);
  let doc;try{doc=JSON.parse(body);}catch(e){return json({error:"invalid JSON"},400);}
  if(!doc||typeof doc!=="object"||Array.isArray(doc))return json({error:"expected an object"},400);
  const key=keyOf(params.name);const mine=readKey(request);
  const existing=await env.PROGRESS.get(key);if(existing!=null){const v=unwrap(existing);if(v&&v.auth&&v.auth!==mine)return json({error:"wrong key"},401);}
  await env.PROGRESS.put(key,JSON.stringify({__auth:mine,doc}));
  return json({ok:true,updatedAt:doc.updatedAt||null});
}
export const onRequestPut=save;
export const onRequestPost=save;
