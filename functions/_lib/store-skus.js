/** Catalog of file-fulfillment SKUs for Stripe Payment Link pilots. */
export const STORE_SKUS = {
  "null-harbor": {
    sku: "null-harbor",
    title: "Null Harbor",
    blurb: "Near-future thriller novella",
    files: [
      { id: "epub", key: "null-harbor/Null-Harbor.epub", filename: "Null-Harbor.epub", type: "application/epub+zip" },
      { id: "pdf", key: "null-harbor/Null-Harbor.pdf", filename: "Null-Harbor.pdf", type: "application/pdf" },
    ],
  },
  "he-came-home-without-her": {
    sku: "he-came-home-without-her",
    title: "He Came Home Without Her",
    blurb: "A domestic thriller.",
    files: [
      { id: "epub", key: "he-came-home-without-her/He-Came-Home-Without-Her.epub", filename: "He-Came-Home-Without-Her.epub", type: "application/epub+zip" },
      { id: "docx", key: "he-came-home-without-her/He-Came-Home-Without-Her.docx", filename: "He-Came-Home-Without-Her.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ],
  },
  "reply-forge": {
    sku: "reply-forge",
    title: "Reply Forge",
    blurb: "Ready-to-send customer replies.",
    files: [
      { id: "zip", key: "reply-forge/Reply-Forge-v1.1.zip", filename: "Reply-Forge-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "reply-forge/Reply-Forge-On-Your-Phone.pdf", filename: "Reply-Forge-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },

  "scope-lock": {
    sku: "scope-lock",
    title: "Scope Lock",
    blurb: "A client brief that holds the scope.",
    files: [
      { id: "zip", key: "scope-lock/Scope-Lock-v1.1.zip", filename: "Scope-Lock-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "scope-lock/Scope-Lock-On-Your-Phone.pdf", filename: "Scope-Lock-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },
  "rate-wire": {
    sku: "rate-wire",
    title: "Rate Wire",
    blurb: "Hourly and day rates, figured before you quote.",
    files: [
      { id: "zip", key: "rate-wire/Rate-Wire-v1.1.zip", filename: "Rate-Wire-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "rate-wire/Rate-Wire-On-Your-Phone.pdf", filename: "Rate-Wire-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },

  "invoice-desk": {
    sku: "invoice-desk",
    title: "Invoice Desk",
    blurb: "Clean invoices for freelancers.",
    files: [
      { id: "zip", key: "invoice-desk/Invoice-Desk-v1.1.zip", filename: "Invoice-Desk-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "invoice-desk/Invoice-Desk-On-Your-Phone.pdf", filename: "Invoice-Desk-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },
  "focus-gate": {
    sku: "focus-gate",
    title: "Focus Gate",
    blurb: "A deep-work timer for one session at a time.",
    files: [
      { id: "zip", key: "focus-gate/Focus-Gate-v1.1.zip", filename: "Focus-Gate-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "focus-gate/Focus-Gate-On-Your-Phone.pdf", filename: "Focus-Gate-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },
  "box-go": {
    sku: "box-go",
    title: "Box & Go",
    blurb: "A moving planner for the boxes and the list.",
    files: [
      { id: "zip", key: "box-go/Box-and-Go-v1.1.zip", filename: "Box-and-Go-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "box-go/Box-and-Go-On-Your-Phone.pdf", filename: "Box-and-Go-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },

  "packlane": {
    sku: "packlane",
    title: "Packlane",
    blurb: "Packing lists for the trip you are taking.",
    files: [
      { id: "zip", key: "packlane/Packlane-v1.1.zip", filename: "Packlane-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "packlane/Packlane-On-Your-Phone.pdf", filename: "Packlane-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },
  "streak-kit": {
    sku: "streak-kit",
    title: "Streak Kit",
    blurb: "Daily streaks, kept on your phone. No account.",
    files: [
      { id: "zip", key: "streak-kit/Streak-Kit-v1.1.zip", filename: "Streak-Kit-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "streak-kit/Streak-Kit-On-Your-Phone.pdf", filename: "Streak-Kit-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },
  "launch-ledger": {
    sku: "launch-ledger",
    title: "Launch Ledger",
    blurb: "Income, kept in one ledger.",
    files: [
      { id: "zip", key: "launch-ledger/Launch-Ledger-v1.1.zip", filename: "Launch-Ledger-v1.1.zip", type: "application/zip" },
      { id: "pdf", key: "launch-ledger/Launch-Ledger-On-Your-Phone.pdf", filename: "Launch-Ledger-On-Your-Phone.pdf", type: "application/pdf" },
    ],
  },

};

export function getSku(sku) {
  return STORE_SKUS[String(sku || "").trim()] || null;
}
