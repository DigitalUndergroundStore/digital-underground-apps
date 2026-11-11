/* Pretty listing URL, mirrors functions/_lib/listing-url.js. window.duListingPath({id,name}) */
(function () {
  function base(s) { return String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, ""); }
  function tail(id) { return String(id || "").split("_").pop().toLowerCase().replace(/[^a-z0-9]/g, ""); }
  window.duListingPath = function (r) { var b = base(r && r.name), t = tail(r && r.id); return "/community/p/" + (b && b !== t ? b + "-" + t : t) + "/"; };
})();
