# Audio Script Improvements Plan

**Goal:** Improve `public/audio/_review/split_and_transcribe.py` with 7 targeted fixes.

**File modified:** `public/audio/_review/split_and_transcribe.py`  
**New test file:** `public/audio/_review/test_mappings.py`

---

## Task 1 — Temp cleanup on crash

Wrap `segs, tmp_dir = split_to_temp(...)` + processing body in `try/finally` in all three
`process_numbers`, `process_letters`, `process_phrases` functions. Move `shutil.rmtree`
into the `finally` block with `ignore_errors=True`.

```python
segs, tmp_dir = split_to_temp(src, SILENCE_DUR["numbers"])
try:
    # ... existing loop ...
finally:
    shutil.rmtree(tmp_dir, ignore_errors=True)
```

Commit: `fix: clean up temp dir on crash or KeyboardInterrupt`

---

## Task 2 — Fix `map_letter` digraph ambiguity + add tests

**The bug:** after stripping context words from Gemini output (e.g. `"písmeno Á"`), the
fallback "contains" pass sorts by length-descending but doesn't break ties correctly —
single-char base letters (e.g. `a`) can match before their diacritic variant (`á`) when
both have length 1, because dict insertion order puts `a` first.

**Fix:** insert a token-based second pass between the existing exact-match pass and the
full-string contains pass:

```python
def map_letter(text):
    t = text.strip().lower()
    t_stripped = re.sub(r"[^a-záäčďdždzéfghiíjkľĺlmnňoóôpqrŕsšťtuúvwxyýzž]", "", t)
    by_len = sorted(LETTER_MAP.items(), key=lambda x: -len(x[0]))

    # pass 1: exact match on full stripped string
    for letter, key in by_len:
        if t_stripped == letter:
            return key

    # pass 2: exact match on each whitespace token (handles "písmeno DŽ")
    for token in t.split():
        tok = re.sub(r"[^a-záäčďdždzéfghiíjkľĺlmnňoóôpqrŕsšťtuúvwxyýzž]", "", token)
        for letter, key in by_len:
            if tok == letter:
                return key

    # pass 3: substring fallback (last resort)
    for letter, key in by_len:
        if letter in t_stripped:
            return key

    return None
```

**Test file** `public/audio/_review/test_mappings.py` — run with `python3 test_mappings.py`:

```python
from split_and_transcribe import map_letter, map_number, map_phrase

# map_letter
assert map_letter("DŽ")          == "dzh",       "uppercase digraph"
assert map_letter("dž")          == "dzh",       "lowercase digraph"
assert map_letter("DZ")          == "dz",        "dz digraph"
assert map_letter("Á")           == "a-acute",   "accented vowel"
assert map_letter("písmeno Á")   == "a-acute",   "Gemini context prefix + accented"
assert map_letter("písmeno DŽ")  == "dzh",       "Gemini context prefix + digraph"
assert map_letter("CH")          == "ch",        "ch digraph"
assert map_letter("Ľ")           == "l-caron",   "l with caron"

# map_number
assert map_number("dva")         == "2"
assert map_number("dvadsať")     == "20"
assert map_number("15")          == "15"
assert map_number("pätnásť")     == "15"

# map_phrase
assert map_phrase("Výborne!")    == ("praise",  "vyborne")
assert map_phrase("skvelá práca")== ("praise",  "skvela-praca")
assert map_phrase("Nájdi písmenko") == ("phrases", "najdi-pismeno")

print("All assertions passed.")
```

Commit: `fix: map_letter token pass prevents diacritic/base-letter ambiguity`

---

## Task 3 — Deduplicate `PHRASE_MAP` via diacritic normalisation

Currently every phrase appears twice (with and without diacritics). Instead, normalise
the lookup text with `unicodedata` and keep only the canonical (diacritics) keys.

Add import: `import unicodedata`

Add helper:
```python
def _normalise(s):
    """Lowercase + strip diacritics for map lookup."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )
```

Remove all no-diacritics duplicate keys from `PHRASE_MAP` (e.g. `"nájdi pismenko"`,
`"skus to znova"`, `"vyborne"`, etc. — keep only the accented form).

Update `map_phrase`:
```python
def map_phrase(text):
    t = re.sub(r"[!?.,]", "", _normalise(text.strip()))
    # exact match
    for key, val in PHRASE_MAP.items():
        if _normalise(key) == t:
            return val
    # partial / fuzzy match
    for key, val in PHRASE_MAP.items():
        nk = _normalise(key)
        if nk in t or t in nk:
            return val
    return None
```

Update existing `map_phrase` tests in `test_mappings.py` to also test the no-diacritics
input path (e.g. `map_phrase("vyborne")` should still return `("praise", "vyborne")`).

Commit: `refactor: normalise diacritics in map_phrase, dedupe PHRASE_MAP`

---

## Task 4 — Save unmatched clips to `_new/unmatched/`

Change `_report_unmatched` signature to accept `kind` (e.g. `"letters"`) and update callers.
Copy each unmatched temp file to `_new/unmatched/<kind>_<n>.mp3` before the tmp dir is removed.

```python
def _report_unmatched(items, kind, out_base):
    if not items:
        return
    unmatched_dir = os.path.join(out_base, "unmatched")
    os.makedirs(unmatched_dir, exist_ok=True)
    print(f"\n  ⚠  {len(items)} unmatched segment(s) saved to {unmatched_dir}/")
    for i, (tmp, text, dur) in enumerate(items, 1):
        dest = os.path.join(unmatched_dir, f"{kind}_{i:02d}.mp3")
        shutil.copy2(tmp, dest)
        print(f"      {dest}  ({dur:.2f}s)  transcribed as: {text!r}")
```

Update all three `_report_unmatched(unmatched)` call sites to
`_report_unmatched(unmatched, "numbers", OUTPUT_BASE)` etc.

Commit: `feat: save unmatched clips to _new/unmatched/ for manual review`

---

## Task 5 — Skip existing output files (`--overwrite`)

Add `--overwrite` flag to `argparse` (default: `False`).

Pass the flag through to each `process_*` function. Before every `shutil.copy2(tmp, dest)`,
check:

```python
if not overwrite and os.path.exists(dest):
    print(f"  –  skipping {dest} (already exists, use --overwrite)")
    continue
```

Apply the same check in `process_phrases` for the `out_path` variable.

Commit: `feat: skip existing output files by default, add --overwrite flag`

---

## Task 6 — Respect Gemini 429 / `Retry-After`

In `transcribe`, before the generic `resp.raise_for_status()`, handle 429 explicitly:

```python
if resp.status_code == 429:
    wait = int(resp.headers.get("Retry-After", 30))
    print(f"      ↩ rate-limited — sleeping {wait}s…")
    time.sleep(wait)
    continue  # retry same attempt index
```

Also change the retry `except` block to only catch network/timeout errors, not HTTP errors,
so non-429 HTTP errors surface immediately rather than being silently retried:

```python
except requests.exceptions.RequestException as e:
    if attempt == retries - 1:
        raise
    print(f"      ↩ retry ({e})…")
    time.sleep(2 ** attempt)
```

Commit: `fix: handle Gemini 429 with Retry-After, don't swallow HTTP errors`

---

## Task 7 — Parallel Gemini transcription

Add import: `from concurrent.futures import ThreadPoolExecutor, as_completed`

Replace the sequential `for start, end, tmp in segs:` loops in all three `process_*`
functions with a parallel pattern. Example for `process_letters`:

```python
def _transcribe_segment(args):
    start, end, tmp, prompt = args
    text = transcribe(tmp, prompt)
    return start, end, tmp, text

with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {
        pool.submit(_transcribe_segment, (s, e, tmp, prompt)): (s, e, tmp)
        for s, e, tmp in segs
    }
    results = []
    for fut in as_completed(futures):
        results.append(fut.result())

# sort by start time to preserve printed order
for start, end, tmp, text in sorted(results, key=lambda x: x[0]):
    key = map_letter(text)
    ...
```

`max_workers=8` keeps concurrent requests reasonable; tune down if rate limits persist.

Commit: `perf: parallelise Gemini transcription with ThreadPoolExecutor`
