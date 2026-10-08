/* One-time Gumroad license check. No secret.
   The product id lives in config.js. After a key is accepted, Cork stores
   only that id, the key, and the time — never the buyer's email or payment. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CorkLicense = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var PLACEHOLDER = "PASTE_PRODUCT_ID_HERE";
  var STORAGE = "cork-license-v1";
  var VERIFY = "https://api.gumroad.com/v2/licenses/verify";
  var NET = "No connection. Cork needs wifi once to check the key, then it works offline.";
  var BAD = "That key doesn't match this product. Check the receipt and try again.";
  var REFUND = "This purchase was refunded, so the key no longer unlocks Cork.";

  function productId() {
    var id = root.CORK_GUMROAD_PRODUCT_ID;
    if (typeof id !== "string") return "";
    return id.trim();
  }

  function mode() {
    var id = root.CORK_GUMROAD_PRODUCT_ID;
    if (typeof id !== "string") return "broken";
    if (id.trim() === "" || id.trim() === PLACEHOLDER) return "preview";
    return "sale";
  }

  function store() {
    try { return root.localStorage; } catch (e) { return null; }
  }

  function read() {
    var s = store();
    if (!s) return null;
    try { return JSON.parse(s.getItem(STORAGE) || "null"); } catch (e) { return null; }
  }

  function write(rec) {
    var s = store();
    if (!s) return;
    s.setItem(STORAGE, JSON.stringify(rec));
  }

  function clear() {
    var s = store();
    if (!s) return;
    s.removeItem(STORAGE);
  }

  function cleanKey(k) {
    return String(k == null ? "" : k).replace(/\s+/g, "");
  }

  function isUnlocked() {
    var rec;
    if (mode() !== "sale") return false;
    rec = read();
    return !!(rec && rec.unlocked === true && rec.productId === productId() && rec.licenseKey);
  }

  function friendlyInvalid(data) {
    var m = data && data.message ? String(data.message) : "";
    if (/refund/i.test(m)) return REFUND;
    if (/does not exist/i.test(m) || /license/i.test(m)) return BAD;
    return BAD;
  }

  function verify(licenseKey, increment) {
    var body, ctrl, timer, signal;
    body = new URLSearchParams();
    body.set("product_id", productId());
    body.set("license_key", licenseKey);
    body.set("increment_uses_count", increment ? "true" : "false");
    ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    signal = ctrl ? ctrl.signal : undefined;
    timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    return fetch(VERIFY, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: signal
    }).then(function (res) {
      clearTimeout(timer);
      if (res.status >= 500) return { ok: false, network: true, message: NET };
      return res.text().then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) {
          return { ok: false, network: true, message: "Gumroad didn't answer clearly. Check the connection and try again." };
        }
        if (!data || data.success !== true) {
          return { ok: false, locked: true, message: friendlyInvalid(data) };
        }
        if (data.purchase && (data.purchase.refunded === true || data.purchase.chargebacked === true)) {
          return { ok: false, locked: true, revoked: true, message: REFUND };
        }
        return { ok: true };
      });
    }).catch(function () {
      clearTimeout(timer);
      return { ok: false, network: true, message: NET };
    });
  }

  function unlock(licenseKey) {
    var key;
    if (mode() !== "sale") return Promise.resolve({ ok: false, message: "This copy has no Gumroad product id yet." });
    key = cleanKey(licenseKey);
    if (!key) return Promise.resolve({ ok: false, locked: true, message: "Enter the license key from your receipt." });
    return verify(key, true).then(function (r) {
      if (!r.ok) return r;
      write({
        v: 1,
        productId: productId(),
        licenseKey: key,
        unlocked: true,
        verifiedAt: new Date().toISOString()
      });
      return { ok: true };
    });
  }

  function recheck() {
    var rec;
    if (mode() !== "sale") return Promise.resolve({ ok: true, skipped: true });
    rec = read();
    if (!rec || rec.unlocked !== true || rec.productId !== productId() || !rec.licenseKey) {
      return Promise.resolve({ ok: false, skipped: true });
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return Promise.resolve({ ok: true, offline: true });
    }
    return verify(rec.licenseKey, false).then(function (r) {
      if (r.ok) return r;
      if (r.network) return { ok: true, offline: true };
      clear();
      return r;
    });
  }

  return {
    PLACEHOLDER: PLACEHOLDER,
    mode: mode,
    productId: productId,
    isUnlocked: isUnlocked,
    unlock: unlock,
    recheck: recheck,
    clear: clear,
    cleanKey: cleanKey
  };
});
