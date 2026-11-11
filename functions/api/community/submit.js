import {
  checkRate,
  SUBMIT_RATE_LIMIT,
  canonicalProjectUrl,
  kvGetIndex,
  kvGetListing,
  clientIp,
  getKv,
  screenedStatus,
  json,
  notifySubmission,
  sendMakerWelcome,
  saveListing,
  upsertContact,
  validateSubmission,
  verifyTurnstile,
} from "../../_lib/community.js";
import {
  attachListing,
  authCreator,
  accountIdForLogin,
  checkPassword,
  creatorIdsForEmail,
  getAccount,
  loginAllowed,
  MIN_PASSWORD,
  setCredentials,
  setLoginEmail,
  validPassword,
  issueAccountToken,
  linkContactToCreator,
  sessionCookie,
} from "../../_lib/creator.js";
import { screenListing } from "../../_lib/community-screening.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ error: "Use POST with JSON body." }, 405);
  }

  const ip = clientIp(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const turnstile = await verifyTurnstile(env, body.turnstileToken ?? body["cf-turnstile-response"], ip);
  if (!turnstile.ok) {
    return json({ error: turnstile.error || "Security check failed." }, 400);
  }

  const validated = validateSubmission(body);
  if (validated.error) {
    return json({ error: validated.error }, validated.status || 400);
  }

  const kv = getKv(env);
  if (!kv) {
    return json(
      {
        error:
          "Community storage is not configured yet. Bind COMMUNITY_KV on Cloudflare Pages (see docs/community-marketplace.md).",
      },
      503
    );
  }

  let listing = validated.listing;
  const password = typeof body.password === "string" ? body.password : "";
  if (body.passwordConfirm != null && body.passwordConfirm !== password) {
    return json({ error: "Passwords don't match." }, 400);
  }

  // Count against the submit quota only once Turnstile, validation and password match pass,
  // so a maker fixing form errors isn't locked out by their own retries.
  if (!(await checkRate(env, ip, "", SUBMIT_RATE_LIMIT))) {
    return json({ error: "Too many submissions. Try again later." }, 429);
  }

  // Account resolution (before screening, so a bad password costs nothing):
  // 1) Signed-in creator (cookie or private link) -> that account. If it has no password
  //    yet, the email + password on this submission claim it.
  // 2) Email has a login -> password must match; then sign in.
  // 3) Email linked to an unclaimed legacy account -> attach there, no sign-in.
  // 4) New creator -> password required; create account and sign in.
  let acct = null;
  let signIn = false;
  let attachedUnclaimed = false;
  let isNew = false;
  try {
    acct = await authCreator(request, env, kv);
    if (acct) {
      signIn = true;
      // One email = one account: a signed-in creator's listings always use the account email.
      if (acct.email) listing.email = acct.email;
      if (!acct.pw) {
        if (!validPassword(password)) return json({ error: `Create a password (at least ${MIN_PASSWORD} characters).` }, 400);
        const r = await setCredentials(kv, acct, listing.email, password);
        if (r.error) return json({ error: r.error }, 400);
      }
    } else if (await accountIdForLogin(kv, listing.email)) {
      if (!(await loginAllowed(env, ip, listing.email))) return json({ error: "Too many attempts. Try again later." }, 429);
      acct = await checkPassword(kv, listing.email, password);
      if (!acct) {
        return json({ error: "You already have an account with this email. Enter its password, or log in first (Forgot password works too)." }, 400);
      }
      signIn = true;
    } else {
      const ids = await creatorIdsForEmail(kv, listing.email);
      for (const cid of [...ids].reverse()) {
        const a = await getAccount(kv, cid);
        if (a && !a.pw && !a.mergedInto) { acct = a; attachedUnclaimed = true; break; }
      }
      // Tie that older account to this email so Forgot password can find it.
      if (acct && !acct.email) await setLoginEmail(kv, acct, listing.email);
      if (!acct) {
        if (!validPassword(password)) return json({ error: `Create a password (at least ${MIN_PASSWORD} characters).` }, 400);
        acct = (await issueAccountToken(kv, null)).acct;
        const r = await setCredentials(kv, acct, listing.email, password);
        if (r.error) return json({ error: r.error }, 400);
        signIn = true;
        isNew = true;
      }
    }
    listing.creatorId = acct.id;
  } catch (e) {
    console.error("community creator account error", e);
    return json({ error: "Could not set up your creator account. Try again." }, 500);
  }
  // Double-submit guard (Nov 2 2026, CrewCentral posted twice 9s apart): same name + project URL
  // submitted in the last 30 minutes returns the existing listing instead of creating a second one.
  try {
    const u = canonicalProjectUrl(listing.projectUrl), nm = String(listing.name || "").trim().toLowerCase();
    if (u && nm) {
      const ix = await kvGetIndex(kv), cutoff = Date.now() - 30 * 60 * 1000;
      for (const id of [...ix.approved, ...ix.pending].slice(-200)) {
        const m = /^cm_([a-z0-9]+)_/.exec(id); if (!m || parseInt(m[1], 36) < cutoff) continue;
        const r = await kvGetListing(kv, id);
        if (r && String(r.name || "").trim().toLowerCase() === nm && canonicalProjectUrl(r.projectUrl) === u)
          return json({ ok: true, id: r.id, status: r.status, duplicate: true, message: "This project was already submitted a moment ago, so we kept the first one." }, 200);
      }
    }
  } catch (e) { console.error("dup check", e); }
  try {
    const screen = await screenListing(env, listing);
    // Every maker goes live once the automatic checks pass; flagged or failed listings stay in the owner queue.
    listing.status = screenedStatus(screen.decision);
    if (listing.status === "approved") listing.autoApprovedAt = Date.now();
    listing.screening = {
      reasons: screen.decision === "approved"
        ? ["Passed automatic checks: auto-approved."]
        : screen.reasons,
      detail: screen.detail,
      screenedAt: Date.now(),
    };
  } catch (e) {
    console.error("community screening error", e);
    listing.status = "pending";
    listing.screening = {
      reasons: ["Automatic screening failed; queued for human review."],
      screenedAt: Date.now(),
    };
  }

  try {
    await saveListing(kv, listing);
    if (acct) await attachListing(kv, acct, listing.id);
  } catch (e) {
    console.error("community submit kv error", e);
    return json({ error: "Could not save submission." }, 500);
  }

  try {
    await upsertContact(kv, {
      email: listing.email,
      name: listing.makerName,
      listingId: listing.id,
    });
  } catch (e) {
    console.error("community contact upsert error", e);
  }
  if (acct) {
    try {
      await linkContactToCreator(kv, listing.email, acct.id);
    } catch (e) {
      console.error("community contact link error", e);
    }
  }

  try {
    // Delivery status stays server-side (logs only), never in the client response.
    await notifySubmission(env, listing, request);
  } catch (e) {
    console.error("community notify error", e);
  }

  let makerEmail = { sent: false };
  try {
    const w = await sendMakerWelcome(env, kv, listing, request);
    makerEmail = { sent: !!w?.sent, reason: w?.reason || undefined };
  } catch (e) {
    console.error("community maker welcome error", e);
    makerEmail = { sent: false, reason: "welcome_threw" };
  }

  const messages = {
    approved:
      "Thanks — your project passed review and is live on the community marketplace.",
    rejected:
      "Thanks for submitting. This listing did not pass our automated checks. Contact us if you think that is a mistake.",
    pending:
      "Thanks — your project is in the review queue. We will email you when it is live.",
  };

  const headers = {};
  if (acct && signIn) {
    const c = await sessionCookie(env, acct);
    if (c) headers["Set-Cookie"] = c;
  }
  return json({
    ok: true,
    id: listing.id,
    status: listing.status,
    message: messages[listing.status] || messages.pending,
    newAccount: isNew,
    signedIn: signIn,
    attachedUnclaimed,
    makerEmail,
  }, 200, headers);
}
