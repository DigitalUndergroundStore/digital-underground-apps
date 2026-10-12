const fs = require("fs");
const path = require("path");

function loadSecret() {
  const env = process.env.PW_SECRET;
  if (env && fs.existsSync(env)) return parseSecret(fs.readFileSync(env, "utf8"));
  const candidates = [
    path.join(__dirname, "../secrets/SECRET-pantry-week-buyer-code.txt"),
    "/cursor/stores/bc-db16adba-726f-5f19-a0ab-fa82d552ca1d/internal/secrets/SECRET-pantry-week-buyer-code.txt",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return parseSecret(fs.readFileSync(p, "utf8"));
  }
  throw new Error("buyer secret not found");
}

function parseSecret(text) {
  let code = "";
  for (const line of text.split(/\n/)) {
    if (line.startsWith("CODE=")) code = line.slice(5).trim();
  }
  if (!code) throw new Error("CODE missing in secret file");
  return { code };
}

module.exports = { loadSecret };
