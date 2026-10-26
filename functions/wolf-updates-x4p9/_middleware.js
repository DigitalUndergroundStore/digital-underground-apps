// Wolf's private updates page: no password (unguessable URL, approved by Donald). Keep it out of search.
export async function onRequest(ctx) {
  const r = await ctx.next();
  const res = new Response(r.body, r);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}
