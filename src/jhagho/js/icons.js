/* Inline SVG icons for tabs and UI (no external font glyphs). */
"use strict";
(function () {
  var ICONS = {
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 1 1-8 8 8 8 0 0 1 8-8Zm-.75 3v5.25l4.5 2.7.75-1.23-3.75-2.25V7Z"/></svg>',
    recipes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v2H4V4Zm0 5h10v2H4V9Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4h-2l-1 2v2h16V6l-1-2h-2l-1 8H8L7 4Zm-1 12h12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3Z"/></svg>',
    pantry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 3h16v4H4V3Zm2 6h12v12H6V9Zm2 2v8h8v-8H8Z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>'
  };
  window.PW_ICONS = {
    tab: function (id) {
      return ICONS[id] || ICONS.more;
    }
  };
})();
