#!/usr/bin/env node
/**
 * ingest.mjs — elle yazılan içeriği (data/manual/<pack>.jsonl) pakete dönüştürür.
 *
 * Her satır: {"w":"analyse","tr":"...","d":"...","s":"..."}
 * z (zorluk) data/<pack>.seed.json'dan alınır — elle yazmaya gerek yok.
 * generate.mjs ile AYNI kalite kapısı uygulanır; geçemeyen satır pakete girmez.
 *
 *   node scripts/ingest.mjs academic
 *   node scripts/ingest.mjs --all
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STEM = (w) => w.replace(/(ies|ied|ing|ely|es|ed|ly|s|e)$/i, "").slice(0, Math.max(4, w.length - 3));

function validate(word, rec) {
  const p = [];
  const tr = (rec?.tr || "").trim(), d = (rec?.d || "").trim(), s = (rec?.s || "").trim();
  if (!tr) p.push("tr boş"); else if (tr.length > 60) p.push("tr çok uzun");
  if (!d) p.push("d boş");
  else {
    const wc = d.split(/\s+/).length;
    if (wc < 3 || wc > 20) p.push(`d kelime sayısı ${wc}`);
    if (new RegExp(`\\b${STEM(word)}`, "i").test(d)) p.push("tanımda kelimenin kökü geçiyor");
  }
  if (!s) p.push("s boş");
  else {
    const wc = s.split(/\s+/).length;
    if (wc < 5 || wc > 24) p.push(`s kelime sayısı ${wc}`);
    if (!new RegExp(`\\b${STEM(word)}`, "i").test(s)) p.push("cümlede kelime geçmiyor");
  }
  return p;
}

function run(pack) {
  const seedPath = resolve(ROOT, `data/${pack}.seed.json`);
  const jsonl = resolve(ROOT, `data/manual/${pack}.jsonl`);
  if (!existsSync(seedPath)) return console.error(`tohum yok: ${pack}`);
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const zOf = new Map(seed.map((o) => [o.w, o.z]));
  const order = new Map(seed.map((o, i) => [o.w, i]));

  const rows = new Map();
  const outPath = resolve(ROOT, `packs/${pack}.json`);
  if (existsSync(outPath)) for (const o of JSON.parse(readFileSync(outPath, "utf8"))) rows.set(o.w, o);

  const bad = [], unknown = [], dupes = [];
  if (existsSync(jsonl)) {
    for (const [i, line] of readFileSync(jsonl, "utf8").split("\n").entries()) {
      const t = line.trim();
      if (!t || t.startsWith("//")) continue;
      let rec;
      try { rec = JSON.parse(t); } catch (e) { bad.push(`satır ${i + 1}: bozuk JSON`); continue; }
      if (!zOf.has(rec.w)) { unknown.push(rec.w); continue; }
      if (rows.has(rec.w)) dupes.push(rec.w);
      const problems = validate(rec.w, rec);
      if (problems.length) { bad.push(`${rec.w}: ${problems.join("; ")}`); continue; }
      rows.set(rec.w, { w: rec.w, tr: rec.tr.trim(), d: rec.d.trim(), s: rec.s.trim(), z: zOf.get(rec.w) });
    }
  }

  const out = [...rows.values()].sort((a, b) => order.get(a.w) - order.get(b.w));
  writeFileSync(outPath, JSON.stringify(out));
  writeFileSync(resolve(ROOT, `packs/_meta-${pack}.json`),
    JSON.stringify({ pack, count: out.length, total: seed.length, updated: new Date().toISOString() }, null, 2));

  const missing = seed.filter((o) => !rows.has(o.w)).map((o) => o.w);
  writeFileSync(resolve(ROOT, `data/${pack}.missing.json`), JSON.stringify(missing));
  console.log(`${pack}: ${out.length}/${seed.length} hazır · ${missing.length} eksik`);
  if (dupes.length) console.log(`  ⟳ ${dupes.length} kelime yeniden yazıldı`);
  if (unknown.length) console.log(`  ? tohumda olmayan: ${unknown.slice(0, 8).join(", ")}${unknown.length > 8 ? "…" : ""}`);
  if (bad.length) { console.log(`  ✗ kapıdan geçemeyen ${bad.length}:`); bad.slice(0, 15).forEach((b) => console.log("    " + b)); }
}

const args = process.argv.slice(2);
const packs = args.includes("--all") ? ["core", "academic", "exam"] : args.filter((a) => !a.startsWith("--"));
if (!packs.length) { console.error("kullanım: node scripts/ingest.mjs <core|academic|exam|--all>"); process.exit(1); }
packs.forEach(run);
