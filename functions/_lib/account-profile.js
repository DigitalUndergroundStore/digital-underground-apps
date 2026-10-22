/** Owner identity + account avatar helpers. Never returns or logs the owner email. */
import { normalizeEmail } from "./community.js";
import { sha256Hex } from "./creator.js";

const OWNER_EMAIL_HASH = "468ac153ac2d92cc5593af403ae7024ccb4c3ccf7ca6bd4f18eb0b2be00d85ac"; // sha256("owner|" + owner email)
export async function isOwnerEmail(env, email) {
  const e = normalizeEmail(email || "");
  if (!e) return false;
  if (env.OWNER_EMAIL) return e === normalizeEmail(env.OWNER_EMAIL);
  return (await sha256Hex("owner|" + e)) === OWNER_EMAIL_HASH;
}
/** Trusted static default for the owner account (official DU mark). Not an upload. */
export const OWNER_DEFAULT_AVATAR = "/assets/logo/du-mark.svg";
export const avatarKey = (acctId) => "avatar:" + acctId;
export const avatarUrl = (acct) => (acct?.avatar?.v ? `/api/account/avatar?id=${encodeURIComponent(acct.id)}&v=${acct.avatar.v}` : "");
/** Avatar to show: custom upload, else the DU mark for the owner, else none (letter). */
export async function shownAvatar(env, acct, isOwner) {
  return avatarUrl(acct) || (isOwner ? OWNER_DEFAULT_AVATAR : "");
}
