// biiwow language router: serves the language apps under biiwow.com/<path>/ by proxying to their Cloudflare Pages sites.
const MAP={
  "language-english":"biiwow-english-steps.pages.dev","language-serbian":"biiwow-serbian-steps.pages.dev",
  "language-hungarian":"biiwow-hungarian-steps.pages.dev","language-spanish":"biiwow-spanish-steps.pages.dev",
  "language-italian":"biiwow-italian-steps.pages.dev","language-french":"biiwow-french-steps.pages.dev",
  "language-german":"biiwow-german-steps.pages.dev","language-dutch":"biiwow-dutch-steps.pages.dev",
  "language-portuguese":"biiwow-portuguese-steps.pages.dev","language-scripts":"nine-scripts.pages.dev",
  "languages":"biiwow-languages.pages.dev"};
export default{async fetch(req){
  const u=new URL(req.url);const m=/^\/([a-z-]+)(\/.*)?$/.exec(u.pathname);const host=m&&MAP[m[1]];
  if(!host)return fetch(req);
  const prefix="/"+m[1];
  if(!m[2]){u.pathname=prefix+"/";return Response.redirect(u.toString(),301);}
  const t=new URL(req.url);t.hostname=host;t.pathname=m[2];
  const r=await fetch(new Request(t.toString(),req),{redirect:"manual"});
  const loc=r.headers.get("location");if(!loc)return r;
  const out=new Response(r.body,r);const l=new URL(loc,t);
  if(l.hostname===host){out.headers.set("location",prefix+l.pathname+l.search);}
  return out;}};
