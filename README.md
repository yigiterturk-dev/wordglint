# WordSpark ⚡

Academic and everyday English vocabulary, at spark speed. A single-file offline PWA
(fork of Kelimşek, retargeted from Turkish exam vocabulary to English vocabulary for
a global audience) plus a Capacitor Android wrapper in `../wordspark-app`.

- **Bilingual.** Interface and word meanings switch between English and Turkish
  (Settings → Language). Auto-detected from `navigator.language` on first run.
- **Offline.** Service worker precaches everything including the word packs.
- **No backend.** Duels, the daily deck and all progress are local + seeded RNG.

## Word packs — where the data comes from

Every pack is built from a published, openly available word list. Nothing is invented.

| Pack | Source list | Words | Notes |
|---|---|---|---|
| 🗣 Everyday English | **NGSL** — New General Service List (Browne, Culligan & Phillips) | 2,712 | ~2,800 headwords minus closed-class function words |
| 🎓 Academic Core | **AWL** — Academic Word List (Coxhead, 2000) | 570 | 10 sublists → difficulty 1/2/3 |
| 📚 IELTS & TOEFL | **NAWL** — New Academic Word List | 963 | split into thirds by SFI → difficulty 1/2/3 |

Headwords were scraped from eapfoundation.com's published tables into
`data/*.seed.json` (`{w, z}` plus source metadata). The seeds carry **only** the
word and its difficulty — meanings, definitions and example sentences are generated.

IELTS and TOEFL do not publish official word lists. The exam pack is the NAWL,
which is the list built specifically from academic texts of the kind those exams
draw on; it is labelled by what it is, not by a claim of being an official list.

## Content generation

`scripts/generate.mjs` turns a seed into a finished pack:

```bash
OPENAI_API_KEY=...    node scripts/generate.mjs --all          # every pack
ANTHROPIC_API_KEY=... PROVIDER=anthropic node scripts/generate.mjs core
GEMINI_API_KEY=...    node scripts/generate.mjs academic --limit 100   # trial run
```

For each word it produces `tr` (Turkish meaning), `d` (English definition) and
`s` (example sentence), then runs a quality gate:

- every field non-empty and within a length band
- the definition must **not** contain the target word's stem
- the example sentence **must** contain the target word or an inflection

Failures are written to `data/<pack>.failed.json` and skipped. The script
checkpoints after every batch — rerun it and it only regenerates what is missing.

## Progress

```bash
node scripts/status.mjs --strict   # tüm paketler: ilerleme + kalite kapısı taraması
node scripts/merge-hand.mjs data/hand/batch-NNN.json   # el üretimi partiyi pakete birleştir
```

| Pack | Done | Target | Status |
|---|---|---|---|
| 🗣 Everyday English | 2,091 | 2,712 | kalan 621 (hepsi ileri) |
| 🎓 Academic Core | 570 | 570 | ✔ bitti |
| 📚 IELTS & TOEFL | 963 | 963 | ✔ bitti |
| **Total** | **3,624** | **4,245** | **%85** |

Hand-written batches live in `data/hand/` and are merged into the pack by
`scripts/merge-hand.mjs`, which enforces the same quality gate as the
generator. Entries rejected by the gate are parked in `data/hand-rejects.json`
until they are rewritten (the file is empty when every reject has been resolved).

## Layout

```
index.html                  the whole app (markup + style + logic)
sw.js                       offline cache
manifest.webmanifest        PWA manifest
data/{awl,ngsl,nawl}.json   raw scraped source lists (headwords + word forms)
data/*.seed.json            pack seeds: {w, z}
packs/*.json                generated packs: {w, tr, d, s, z}   ← app loads these
scripts/generate.mjs        content generator
store/                      Play Store listing, privacy policy, data safety
```

`packs/*.json` is what ships. Until it exists the app falls back to the ~24-word
inline list per pack that lives at the top of the script block — enough to run,
not enough to sell.

## How the bilingual layer works

Source language is **English**. Turkish is a lookup layer, in three parts:

1. `applyMeaningLang()` rewrites `o.m` on every word object to the active
   language's meaning, so the 30+ call sites that read `.m` never had to change.
2. Objects with fixed labels (packs, badges, modes, onboarding, goals) carry
   `*Tr` fields resolved at render.
3. Everything else — static markup and dynamically injected HTML — goes through a
   text-node walker plus a `MutationObserver` keyed on `I18N_TR`. Subtrees marked
   `data-noloc` (words, meanings, example sentences, answer options) are skipped
   so real content is never "translated".

Changing language reloads the page; that is deliberate, it repaints every screen
from the source strings instead of trying to patch live state.
