/* El ile üretilen içerik partilerini packs/core.json'a birleştirir.
 * Aynı kalite kapıları: scripts/generate.mjs'teki validate() birebir kopya.
 * Kullanım: node scripts/merge-hand.mjs data/hand/batch-001.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const arg = process.argv[2];
if (!arg) { console.error("kullanım: node scripts/merge-hand.mjs <data/hand/batch-NN.json>"); process.exit(1); }
if (!existsSync(arg)) { console.error("batch dosyası yok: " + arg); process.exit(1); }

const seed  = JSON.parse(readFileSync("data/core.seed.json", "utf8"));
const seedZ = new Map(seed.map((x) => [x.w, x.z]));
const seedIdx = new Map(seed.map((x, i) => [x.w, i]));
const packPath = "packs/core.json";
const metaPath = "packs/_meta-core.json";
const todoPath = "data/core-todo.json";
const pack = JSON.parse(readFileSync(packPath, "utf8"));
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const todo = existsSync(todoPath) ? JSON.parse(readFileSync(todoPath, "utf8")) : seed;

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
  const problems = [];
  const tr = (rec?.tr || "").trim();
  const d  = (rec?.d  || "").trim();
  const s  = (rec?.s  || "").trim();
  if (!tr) problems.push("tr bos");
  else if (tr.length > 60) problems.push("tr cok uzun");
  if (!d) problems.push("d bos");
  else {
    const wc = d.split(/\s+/).length;
    if (wc < 3 || wc > 20) problems.push(`d kelime sayisi ${wc}`);
    if (rx(word).test(d)) problems.push("tanimda kok geciyor");
  }
  if (!s) problems.push("s bos");
  else {
    const wc = s.split(/\s+/).length;
    if (wc < 5 || wc > 24) problems.push(`s kelime sayisi ${wc}`);
    if (!rx(word).test(s)) problems.push("cumlede kelime yok");
  }
  return problems;
}

const batch = JSON.parse(readFileSync(arg, "utf8"));
if (!Array.isArray(batch)) { console.error("batch bir dizi olmali"); process.exit(1); }

mkdirSync("data/hand", { recursive: true });
const rejPath = "data/hand-rejects.json";
const rejects = existsSync(rejPath) ? JSON.parse(readFileSync(rejPath, "utf8")) : [];

const done = new Set(pack.map((x) => x.w));
let added = 0, skipped = 0, rejected = 0;
const used = new Set();

for (const rec of batch) {
  const w = (rec?.w || "").trim().toLowerCase();
  if (!w || !seedZ.has(w)) { rejected++; rejects.push({ w, why: ["tohumda yok"], rec }); continue; }
  if (done.has(w) || used.has(w)) { skipped++; continue; }
  const problems = validate(w, rec);
  if (problems.length) { rejected++; rejects.push({ w, why: problems, rec }); continue; }
  pack.push({ w, tr: rec.tr.trim(), d: rec.d.trim(), s: rec.s.trim(), z: seedZ.get(w) });
  done.add(w); used.add(w); added++;
}

pack.sort((a, b) => (seedIdx.get(a.w) ?? 1e9) - (seedIdx.get(b.w) ?? 1e9));
meta.count = pack.length;
meta.updated = new Date().toISOString();
const remaining = todo.filter((x) => !done.has(x.w));

writeFileSync(packPath, JSON.stringify(pack));
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
writeFileSync(todoPath, JSON.stringify(remaining));
writeFileSync(rejPath, JSON.stringify(rejects, null, 1));

console.log(`eklendi: ${added} | atlandi: ${skipped} | reddedildi: ${rejected} | kalan: ${remaining.length}`);
if (rejected) console.log("REDDEDILENLER:", rejects.slice(-rejected).map((r) => `${r.w} (${(r.why||[]).join("; ")})`).join(" | "));
