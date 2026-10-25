#!/usr/bin/env node
/**
 * Wordglint içerik üreteci — data/<pack>.seed.json → packs/<pack>.json
 *
 * Her kelime için üretilir:
 *   tr : Türkçe karşılık (1–4 kelime, virgülle en fazla 3 anlam)
 *   d  : İngilizce tanım (learner-dictionary tonu, kelimenin kendisi geçmez)
 *   s  : örnek cümle (kelime ya da bir çekimi MUTLAKA geçer)
 *
 * Kullanım:
 *   OPENAI_API_KEY=... node scripts/generate.mjs core
 *   ANTHROPIC_API_KEY=... PROVIDER=anthropic node scripts/generate.mjs academic exam
 *   node scripts/generate.mjs --all --limit 200      # deneme koşusu
 *
 * Kesilirse tekrar çalıştır: packs/<pack>.json'daki tamamlanmış kayıtlar atlanır.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = Number(process.env.BATCH || 25);
const CONC = Number(process.env.CONC || 4);

/* ---------- sağlayıcılar ---------- */
const PROVIDERS = {
  openai: {
    key: () => process.env.OPENAI_API_KEY,
    model: () => process.env.MODEL || "gpt-4.1-mini",
    async call(prompt, model, key) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model, temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return (await r.json()).choices[0].message.content;
    },
  },
  anthropic: {
    key: () => process.env.ANTHROPIC_API_KEY,
    model: () => process.env.MODEL || "claude-haiku-4-5-20251001",
    async call(prompt, model, key) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model, max_tokens: 8000, temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return (await r.json()).content.map((b) => b.text || "").join("");
    },
  },
  gemini: {
    key: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: () => process.env.MODEL || "gemini-2.5-flash",
    async call(prompt, model, key) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          }),
        }
      );
      if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return (await r.json()).candidates[0].content.parts.map((p) => p.text || "").join("");
    },
  },
};

function pickProvider() {
  const want = process.env.PROVIDER;
  if (want) {
    const p = PROVIDERS[want];
    if (!p) throw new Error(`bilinmeyen PROVIDER: ${want}`);
    if (!p.key()) throw new Error(`${want} için API anahtarı yok`);
    return [want, p];
  }
  for (const [name, p] of Object.entries(PROVIDERS)) if (p.key()) return [name, p];
  throw new Error(
    "API anahtarı bulunamadı. OPENAI_API_KEY, ANTHROPIC_API_KEY ya da GEMINI_API_KEY ver."
  );
}

/* ---------- istem ---------- */
const PACK_CONTEXT = {
  core: "everyday general English (New General Service List) — learners at A2–B2 level",
  academic: "academic English (Coxhead's Academic Word List) — university reading and writing",
  exam: "academic exam English (New Academic Word List) — IELTS and TOEFL reading passages",
};

function buildPrompt(pack, words) {
  return `You are building vocabulary flashcards for ${PACK_CONTEXT[pack]}.

For EACH word below produce exactly three fields:
- "tr": the Turkish meaning. 1-4 words. If the word has clearly distinct senses, give at most 3, separated by ", ". No explanations, no parentheses, lowercase unless a proper noun.
- "d": an English learner's-dictionary definition, 4-14 words, lowercase, no final period. It must NOT contain the target word or any of its inflected forms.
- "s": ONE natural English example sentence, 8-16 words, that contains the target word or an inflected form of it. Sentence case, ends with a period. Make it concrete and memorable, not a dictionary frame.

Use the most frequent, most useful sense of each word — the sense a learner meets first.

Return ONLY a JSON object of this exact shape, with one key per input word:
{"WORD": {"tr": "...", "d": "...", "s": "..."}, ...}

Words:
${words.map((w) => "- " + w).join("\n")}`;
}

/* ---------- kalite kapısı ---------- */
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

function validate(word, rec) {
  const problems = [];
  const tr = (rec?.tr || "").trim();
  const d = (rec?.d || "").trim();
  const s = (rec?.s || "").trim();
  if (!tr) problems.push("tr boş");
  else if (tr.length > 60) problems.push("tr çok uzun");
  if (!d) problems.push("d boş");
  else {
    const wc = d.split(/\s+/).length;
    if (wc < 3 || wc > 20) problems.push(`d kelime sayısı ${wc}`);
    if (new RegExp(`\\b${STEM(word)}`, "i").test(d)) problems.push("tanımda kelimenin kökü geçiyor");
  }
  if (!s) problems.push("s boş");
  else {
    const wc = s.split(/\s+/).length;
    if (wc < 5 || wc > 24) problems.push(`s kelime sayısı ${wc}`);
    if (!new RegExp(`\\b${STEM(word)}`, "i").test(s)) problems.push("cümlede kelime geçmiyor");
  }
  return problems;
}

/* ---------- yardımcılar ---------- */
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error("JSON ayrıştırılamadı: " + t.slice(0, 200));
}

async function withRetry(fn, label, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      const wait = 1500 * 2 ** i;
      console.warn(`  ! ${label} denemesi ${i + 1}/${tries} başarısız: ${e.message}. ${wait}ms bekle`);
      await sleep(wait);
    }
  }
  throw last;
}

/* ---------- ana akış ---------- */
async function runPack(pack, provider, providerName, limitN) {
  const seedPath = resolve(ROOT, `data/${pack}.seed.json`);
  const outPath = resolve(ROOT, `packs/${pack}.json`);
  if (!existsSync(seedPath)) throw new Error(`tohum dosyası yok: ${seedPath}`);

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const done = new Map();
  if (existsSync(outPath)) {
    for (const o of JSON.parse(readFileSync(outPath, "utf8"))) {
      if (!validate(o.w, o).length) done.set(o.w, o);
    }
  }

  let todo = seed.filter((o) => !done.has(o.w));
  if (limitN) todo = todo.slice(0, limitN);
  console.log(`\n▶ ${pack}: ${seed.length} kelime · ${done.size} hazır · ${todo.length} üretilecek`);
  if (!todo.length) { flush(pack, seed, done, outPath); return { pack, generated: 0, failed: [] }; }

  const model = provider.model(), key = provider.key();
  const batches = chunk(todo, BATCH);
  const failed = [];
  let generated = 0, batchNo = 0;

  for (const group of chunk(batches, CONC)) {
    await Promise.all(group.map(async (batch) => {
      const words = batch.map((o) => o.w);
      const no = ++batchNo;
      try {
        const raw = await withRetry(
          () => provider.call(buildPrompt(pack, words), model, key),
          `${pack} yığın ${no}`
        );
        const obj = parseJson(raw);
        for (const o of batch) {
          const rec = obj[o.w] || obj[o.w.toLowerCase()];
          const problems = validate(o.w, rec || {});
          if (problems.length) { failed.push({ w: o.w, why: problems.join("; ") }); continue; }
          done.set(o.w, { w: o.w, tr: rec.tr.trim(), d: rec.d.trim(), s: rec.s.trim(), z: o.z });
          generated++;
        }
      } catch (e) {
        batch.forEach((o) => failed.push({ w: o.w, why: e.message }));
      }
    }));
    flush(pack, seed, done, outPath);
    process.stdout.write(`  ${pack}: ${done.size}/${seed.length} hazır, ${failed.length} eksik\r`);
  }

  flush(pack, seed, done, outPath);
  console.log(`\n✓ ${pack}: +${generated} üretildi · toplam ${done.size}/${seed.length} · eksik ${failed.length}`);
  if (failed.length) {
    writeFileSync(resolve(ROOT, `data/${pack}.failed.json`), JSON.stringify(failed, null, 2));
    console.log(`  eksikler data/${pack}.failed.json — betiği tekrar çalıştır, sadece onlar denenir`);
  }
  return { pack, generated, failed };
}

function flush(pack, seed, done, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  const rows = seed.filter((o) => done.has(o.w)).map((o) => done.get(o.w));
  writeFileSync(outPath, JSON.stringify(rows));
  writeFileSync(
    resolve(ROOT, `packs/_meta-${pack}.json`),
    JSON.stringify({ pack, count: rows.length, total: seed.length, updated: new Date().toISOString() }, null, 2)
  );
}

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limitN = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;
const packs = args.includes("--all")
  ? ["core", "academic", "exam"]
  : args.filter((a) => !a.startsWith("--") && a !== String(limitN));

if (!packs.length) {
  console.error("kullanım: node scripts/generate.mjs <core|academic|exam ...|--all> [--limit N]");
  process.exit(1);
}

const [providerName, provider] = pickProvider();
console.log(`sağlayıcı: ${providerName} · model: ${provider.model()} · yığın: ${BATCH} · eşzamanlı: ${CONC}`);
for (const p of packs) await runPack(p, provider, providerName, limitN);
