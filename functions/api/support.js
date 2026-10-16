import { sendCommunityEmail } from "../_lib/community.js";
const clip = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch (_) { return Response.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true });
  const email = clip(b.email, 200), name = clip(b.name, 100), topic = clip(b.topic, 60) || "Question";
  const msg = String(b.message || "").trim().slice(0, 5000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || msg.length < 5) return Response.json({ ok: false, error: "Please add a valid email and a message." }, { status: 400 });
  const page = clip(b.page, 300);
  const text = [`Support request: ${topic}`, `From: ${name || "(no name)"} <${email}>`, page ? `Page: ${page}` : "", "", msg, "", "Reply to this email to answer them.", "Owner dashboard: https://digitalundergroundstore.com/owner/"].join("\n");
  const owner = env?.SUPPORT_EMAIL || env?.COMMUNITY_OWNER_ALERT_EMAIL || "kerzydon@gmail.com";
  let r = { sent: false };
  try { r = await sendCommunityEmail(env, { to: owner, subject: `Support: ${topic} from ${name || email}`, text, replyTo: email }); } catch (_) {}
  return r.sent ? Response.json({ ok: true }) : Response.json({ ok: false, error: "Couldn't send right now. Please try again." }, { status: 502 });
}
