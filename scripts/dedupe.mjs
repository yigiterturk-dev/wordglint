#!/usr/bin/env node
/**
 * Paketler arası tekrarları temizler — generate.mjs'ten SONRA çalıştır.
 *
 * core ↔ academic: aynı kelime farklı anlamlarla gelebilir (NGSL vs AWL) → korunur.
 * academic ↔ exam: NAWL kelimelerinin çoğu AWL'de aynen var → exam'den çıkarılır.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, `packs/${p}.json`), "utf8"));

const academic = new Set(read("academic").map((o) => o.w.toLowerCase()));
const exam = read("exam");
const kept = exam.filter((o) => !academic.has(o.w.toLowerCase()));
const removed = exam.length - kept.length;

writeFileSync(resolve(ROOT, "packs/exam.json"), JSON.stringify(kept));
writeFileSync(
  resolve(ROOT, "packs/_meta-exam.json"),
  JSON.stringify({ pack: "exam", count: kept.length, total: kept.length, updated: new Date().toISOString() }, null, 2)
);

console.log(`exam: ${removed} tekrar çıkarıldı · ${kept.length} kelime kaldı`);
