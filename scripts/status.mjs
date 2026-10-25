/* Wordglint ilerleme paneli.  Kullanım: node scripts/status.mjs [--strict] */
import { readFileSync, existsSync } from "node:fs";

const PACKS = ["core", "academic", "exam"];
const TOTALS = { core: 2712, academic: 570, exam: 963 };
const BAR = (n, total, w = 22) => {
  const f = Math.round((n / total) * w);
  return "█".repeat(f) + "·".repeat(w - f);
};
const SUFFIX = /(ies|ied|ing|ely|es|ed|ly|s|e)$/i;
/* Kök: soneki at, sonra max(4, len-3) karakterlik önek.
 * Kısa kelimede sonek aslında kelimenin kendisidir (wing→ing, boss→s, seed→ed),
 * bu yüzden sonek atıldıktan sonra kalan 4 karakterden kısaysa kelimeyi olduğu gibi kullan. */
const STEM = (w) => {
  const m = w.match(SUFFIX);
  const base = m ? w.slice(0, -m[1].length) : w;
  const cut = base.slice(0, Math.max(4, w.length - 3));
  return cut.length >= 4 ? cut : w.slice(0, Math.max(4, w.length - 3));
};
const rx = (w) => new RegExp(`\\b${STEM(w)}`, "i");
function validate(word, rec) {
  const p = [];
  const tr = (rec?.tr || "").trim(), d = (rec?.d || "").trim(), s = (rec?.s || "").trim();
  if (!tr) p.push("tr boş");
  else if (tr.length > 60) p.push("tr çok uzun");
  if (!d) p.push("d boş");
  else {
    const wc = d.split(/\s+/).length;
    if (wc < 3 || wc > 20) p.push(`d kelime ${wc}`);
    if (rx(word).test(d)) p.push("tanımda kök");
  }
  if (!s) p.push("s boş");
  else {
    const wc = s.split(/\s+/).length;
    if (wc < 5 || wc > 24) p.push(`s kelime ${wc}`);
    if (!rx(word).test(s)) p.push("cümlede yok");
  }
  return p;
}

const strict = process.argv.includes("--strict");
const rows = [];
for (const p of PACKS) {
  const packPath = `packs/${p}.json`;
  const pack = JSON.parse(readFileSync(packPath, "utf8"));
  const meta = existsSync(`packs/_meta-${p}.json`) ? JSON.parse(readFileSync(`packs/_meta-${p}.json`, "utf8")) : {};
  let bad = [];
  if (strict) for (const e of pack) if (validate(e.w, e).length) bad.push(e.w);
  const seen = new Set(); let dup = 0;
  for (const e of pack) { if (seen.has(e.w)) dup++; seen.add(e.w); }
  const total = TOTALS[p] ?? meta.total;
  const pct = Math.round((pack.length / total) * 100);
  rows.push({ p, n: pack.length, total, pct, meta, bad: bad.length, dup });
}

console.log("Wordglint ⚡ ilerleme\n" + "=".repeat(44));
let done = 0, all = 0;
for (const r of rows) {
  done += r.n; all += r.total;
  const updated = r.meta.updated ? r.meta.updated.slice(0, 10) : "?";
  console.log(`${r.p.padEnd(9)} ${BAR(r.n, r.total)} ${String(r.n).padStart(4)}/${r.total}  %${String(pctOf(r)).padStart(2)}  güncelleme: ${updated}`);
  if (r.bad || r.dup) console.log(`  ⚠ validate hatası: ${r.bad} · tekrar: ${r.dup}`);
  else if (strict) console.log(`  ✔ kalite kapısı temiz (0 hata, 0 tekrar)`);
}
console.log("=".repeat(44));
console.log(`TOPLAM    ${BAR(done, all)} ${done}/${all}  %${Math.round((done / all) * 100)}`);
function pctOf(r) { return Math.round((r.n / r.total) * 100); }

const todoPath = "data/core-todo.json";
if (existsSync(todoPath)) {
  const todo = JSON.parse(readFileSync(todoPath, "utf8"));
  const z = {}; todo.forEach((x) => (z[x.z] = (z[x.z] || 0) + 1));
  const zs = Object.entries(z).map(([k, v]) => `z=${k}: ${v}`).join(" · ");
  console.log(`\nCore kalan: ${todo.length}  (${zs})`);
}
const rejPath = "data/hand-rejects.json";
if (existsSync(rejPath)) {
  const rej = JSON.parse(readFileSync(rejPath, "utf8"));
  const uniq = [...new Set(rej.map((r) => r.w))];
  if (rej.length) console.log(`Red kuyruğu: ${rej.length} kayıt (${uniq.slice(0, 8).join(", ")}${rej.length > 8 ? "…" : ""})`);
  else console.log("Red kuyruğu: boş ✔");
}
