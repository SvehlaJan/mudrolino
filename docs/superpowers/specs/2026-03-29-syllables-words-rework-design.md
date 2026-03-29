# Design: Syllables & Words Rework (H5)

**Date:** 2026-03-29
**Status:** Approved

## Overview

Replace the 60 generated abstract syllables (consonant × vowel) with syllables extracted from 50 curated Slovak words. Add `WORD_ITEMS` for future word-recognition games. Only `contentRegistry.ts` changes — the SyllablesGame consumes `SYLLABLE_ITEMS: ContentItem[]` unchanged.

---

## Changes

| Action | File | Change |
|--------|------|--------|
| Modify | `src/shared/contentRegistry.ts` | Remove generated SYLLABLE_CONSONANTS/SYLLABLE_VOWELS/SYLLABLE_ITEMS; add WORD_ITEMS (50 entries); add SYLLABLE_ITEMS (~65 extracted, deduped entries) |

No other files change.

---

## 50 Slovak Words

Display symbol is lowercase. AudioKey is lowercase word. Syllabification uses `-` as separator.

### Family (4)
| symbol | emoji | audioKey | syllables |
|--------|-------|----------|-----------|
| mama   | 👩    | mama     | MA-MA     |
| tata   | 👨    | tata     | TA-TA     |
| baba   | 👵    | baba     | BA-BA     |
| dedo   | 👴    | dedo     | DE-DO     |

### Animals (14)
| symbol  | emoji | audioKey | syllables  |
|---------|-------|----------|------------|
| pes     | 🐕    | pes      | PES        |
| mačka   | 🐱    | macka    | MAČ-KA     |
| ryba    | 🐟    | ryba     | RY-BA      |
| žaba    | 🐸    | zaba     | ŽA-BA      |
| koza    | 🐐    | koza     | KO-ZA      |
| krava   | 🐄    | krava    | KRA-VA     |
| ovca    | 🐑    | ovca     | OV-CA      |
| líška   | 🦊    | liska    | LÍŠ-KA    |
| myš     | 🐭    | mys      | MYŠ        |
| had     | 🐍    | had      | HAD        |
| žirafa  | 🦒    | zirafa   | ŽI-RA-FA  |
| ťava    | 🐪    | tava     | ŤA-VA      |
| šašo    | 🤡    | saso     | ŠA-ŠO     |
| vrana   | 🐦   | vrana    | VRA-NA     |

### Body (6)
| symbol | emoji | audioKey | syllables |
|--------|-------|----------|-----------|
| ruka   | 🤚    | ruka     | RU-KA     |
| noha   | 🦵    | noha     | NO-HA     |
| oko    | 👁️   | oko      | O-KO      |
| ucho   | 👂    | ucho     | U-CHO     |
| nos    | 👃    | nos      | NOS       |
| ústa   | 👄    | usta     | ÚS-TA     |

### Food (8)
| symbol  | emoji | audioKey | syllables   |
|---------|-------|----------|-------------|
| jablko  | 🍎    | jablko   | JAB-LKO     |
| banán   | 🍌    | banan    | BA-NÁN      |
| jahoda  | 🍓    | jahoda   | JA-HO-DA   |
| malina  | 🫐    | malina   | MA-LI-NA   |
| chlieb  | 🍞    | chlieb   | CHLIEB      |
| mlieko  | 🥛    | mlieko   | MLIE-KO    |
| vajce   | 🥚    | vajce    | VAJ-CE      |
| med     | 🍯    | med      | MED         |

### Nature (8)
| symbol  | emoji | audioKey | syllables |
|---------|-------|----------|-----------|
| voda    | 💧    | voda     | VO-DA     |
| hora    | ⛰️   | hora     | HO-RA     |
| more    | 🌊    | more     | MO-RE     |
| kvety   | 🌸    | kvety    | KVE-TY   |
| strom   | 🌳    | strom    | STROM     |
| mesiac  | 🌙    | mesiac   | ME-SIAC   |
| noc     | 🌑    | noc      | NOC       |
| deň     | ☀️   | den      | DEŇ       |

### Objects (10)
| symbol    | emoji | audioKey  | syllables    |
|-----------|-------|-----------|--------------|
| dom       | 🏠    | dom       | DOM          |
| auto      | 🚗    | auto      | AU-TO        |
| lopta     | ⚽    | lopta     | LOP-TA      |
| kniha     | 📚    | kniha     | KNI-HA      |
| škola     | 🏫    | skola     | ŠKO-LA     |
| stolička  | 🪑    | stoličkа  | STO-LIČ-KA |
| okno      | 🪟    | okno      | OK-NO       |
| dvere     | 🚪    | dvere     | DVE-RE      |
| kočík     | 🛒    | kocik     | KO-ČÍK     |
| lampa     | 💡    | lampa     | LAM-PA      |

---

## Extracted Syllables (SYLLABLE_ITEMS)

Deduped from all 50 words. AudioKey = lowercase symbol. No emoji (syllables are abstract sounds).

| symbol | audioKey | appears in                        |
|--------|----------|-----------------------------------|
| MA     | ma       | mama, malina                      |
| TA     | ta       | tata, lopta, ústa                 |
| BA     | ba       | baba, žaba, banán                 |
| DE     | de       | dedo                              |
| DO     | do       | dedo                              |
| PES    | pes      | pes                               |
| MAČ    | mač      | mačka                             |
| KA     | ka       | mačka, ruka, líška, stolička      |
| RY     | ry       | ryba                              |
| BA     | ba       | (dedup)                           |
| ŽA     | ža       | žaba                              |
| KO     | ko       | koza, oko, kočík                  |
| ZA     | za       | koza                              |
| KRA    | kra      | krava                             |
| VA     | va       | krava, ťava                       |
| OV     | ov       | ovca                              |
| CA     | ca       | ovca                              |
| LÍŠ    | líš      | líška                             |
| MYŠ    | myš      | myš                               |
| HAD    | had      | had                               |
| ŽI     | ži       | žirafa                            |
| RA     | ra       | žirafa, hora                      |
| FA     | fa       | žirafa                            |
| ŤA     | ťa       | ťava                              |
| ŠA     | ša       | šašo                              |
| ŠO     | šo       | šašo                              |
| VRA    | vra      | vrana                             |
| NA     | na       | vrana, malina                     |
| RU     | ru       | ruka                              |
| NO     | no       | noha, okno                        |
| HA     | ha       | noha, hora, kniha                 |
| O      | o        | oko                               |
| U      | u        | ucho                              |
| CHO    | cho      | ucho                              |
| NOS    | nos      | nos                               |
| ÚS     | ús       | ústa                              |
| JAB    | jab      | jablko                            |
| LKO    | lko      | jablko (syllabic L)               |
| NÁN    | nán      | banán                             |
| JA     | ja       | jahoda                            |
| HO     | ho       | jahoda, hora                      |
| DA     | da       | voda                              |
| LI     | li       | malina                            |
| CHLIEB | chlieb   | chlieb                            |
| MLIE   | mlie     | mlieko                            |
| VAJ    | vaj      | vajce                             |
| CE     | ce       | vajce                             |
| MED    | med      | med                               |
| VO     | vo       | voda                              |
| MO     | mo       | more                              |
| RE     | re       | more, dvere                       |
| KVE    | kve      | kvety                             |
| TY     | ty       | kvety                             |
| STROM  | strom    | strom                             |
| ME     | me       | mesiac                            |
| SIAC   | siac     | mesiac (diphthong ia)             |
| NOC    | noc      | noc                               |
| DEŇ    | deň      | deň                               |
| DOM    | dom      | dom                               |
| AU     | au       | auto                              |
| TO     | to       | auto                              |
| LOP    | lop      | lopta                             |
| KNI    | kni      | kniha                             |
| ŠKO    | ško      | škola                             |
| LA     | la       | škola                             |
| STO    | sto      | stolička                          |
| LIČ    | lič      | stolička                          |
| OK     | ok       | okno                              |
| DVE    | dve      | dvere                             |
| ČÍK    | čík      | kočík                             |
| LAM    | lam      | lampa                             |
| PA     | pa       | lampa                             |

Total: ~70 unique syllables (vs. 60 generated previously).

---

## AudioKey Notes

- **Words**: ASCII-safe slug where needed (`macka` for mačka, `liska` for líška, `zaba` for žaba, etc.) since word audioKeys map to `/audio/words/<key>.mp3`
- **Syllables**: Lowercase symbol as audioKey (`ža`, `ša`, `ško`, `čík`) — valid UTF-8 filenames, consistent with existing syllable convention. TTS fallback handles missing files.
- Complex syllables (LKO, SIAC, MYŠ, STROM, etc.) are included but will use TTS until recordings are made.

---

## ContentItem type

No changes needed. `category: 'word'` is already in the union type in `src/shared/types.ts`.

---

## Out of scope

- Syllable-to-word linking (no `syllables` field on ContentItem)
- Word-recognition game UI (WORD_ITEMS are data scaffolding only)
- Filtering SYLLABLE_ITEMS by complexity (all extracted syllables are included)
