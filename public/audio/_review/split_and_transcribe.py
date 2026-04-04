#!/usr/bin/env python3
"""
split_and_transcribe.py
=======================
Splits m4a voice recordings into individual mp3 files,
transcribes each clip with Gemini, maps the transcription to the
correct audioKey filename, and places each file under _new/.

Usage:
    GEMINI_API_KEY=AIza... python3 split_and_transcribe.py --letters "Písmenká.m4a" "Dz, dž.m4a"
    GEMINI_API_KEY=AIza... python3 split_and_transcribe.py --numbers "Čísla.m4a" --phrases "Vety.m4a"

    Paths can be absolute or relative to the script directory.

Arguments:
    --numbers FILE [FILE ...]   audio files containing spoken numbers 1–20
    --letters FILE [FILE ...]   audio files containing spoken letters/digraphs
    --phrases FILE [FILE ...]   audio files containing phrases + praise

Requirements:
    pip install requests
    ffmpeg  (brew install ffmpeg on Mac)

Output is written to _new/ next to this script:
    _new/numbers/     ← number clips
    _new/letters/     ← letter clips
    _new/phrases/     ← instruction phrase clips
    _new/praise/      ← praise clips
"""

import argparse, os, sys, re, base64, time, shutil, subprocess, tempfile, unicodedata
import requests

# ── Paths ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BASE = os.path.join(SCRIPT_DIR, "_new")

# ── Gemini API ────────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent?key={key}"
)

# ── Audio split parameters ────────────────────────────────────────────────────

MIN_SPEECH_DURATION = 0.20   # clips shorter than this are filtered as artifacts
SILENCE_NOISE_DB    = "-35dB"
PADDING             = 0.05   # seconds of padding around each extracted clip

SILENCE_DUR = {
    "numbers": 0.5,   # 500 ms gap between items is plenty for digits
    "letters": 0.5,
    "phrases": 0.8,   # multi-word phrases need longer gap to avoid mid-phrase splits
}

# ── Known audioKey mappings (from contentRegistry.ts) ────────────────────────

# Slovak number words → digit string
NUMBER_MAP = {
    "jeden": "1", "jedna": "1", "jedno": "1",
    "dva": "2", "dve": "2",
    "tri": "3",
    "štyri": "4",
    "päť": "5",
    "šesť": "6",
    "sedem": "7",
    "osem": "8",
    "deväť": "9",
    "desať": "10",
    "jedenásť": "11",
    "dvanásť": "12",
    "trinásť": "13",
    "štrnásť": "14",
    "pätnásť": "15",
    "šestnásť": "16",
    "sedemnásť": "17",
    "osemnásť": "18",
    "devätnásť": "19",
    "dvadsať": "20",
}

# Slovak letter/digraph → audioKey (matches contentRegistry.ts)
LETTER_MAP = {
    "a":   "a",            "á":  "a-acute",    "ä":  "a-umlaut",
    "b":   "b",
    "c":   "c",            "č":  "c-caron",
    "d":   "d",            "ď":  "d-caron",
    "dz":  "dz",           "dž": "dzh",
    "e":   "e",            "é":  "e-acute",
    "f":   "f",
    "g":   "g",
    "h":   "h",            "ch": "ch",
    "i":   "i",            "í":  "i-acute",
    "j":   "j",
    "k":   "k",
    "l":   "l",            "ľ":  "l-caron",   "ĺ":  "l-acute",
    "m":   "m",
    "n":   "n",            "ň":  "n-caron",
    "o":   "o",            "ó":  "o-acute",   "ô":  "o-circumflex",
    "p":   "p",
    "q":   "q",
    "r":   "r",            "ŕ":  "r-acute",
    "s":   "s",            "š":  "s-caron",
    "t":   "t",            "ť":  "t-caron",
    "u":   "u",            "ú":  "u-acute",
    "v":   "v",
    "w":   "w",
    "x":   "x",
    "y":   "y",            "ý":  "y-acute",
    "z":   "z",            "ž":  "z-caron",
}

# Slovak phrase text (lowercase, with diacritics) → (subfolder, audioKey)
# Lookup is done via _normalise() so no-diacritics variants need not be listed.
PHRASE_MAP = {
    "nájdi písmenko":    ("phrases", "najdi-pismeno"),
    "toto je písmenko":  ("phrases", "toto-je-pismeno"),
    "skús to znova":     ("phrases", "skus-to-znova"),
    "číslo":             ("phrases", "cislo"),
    "slabika":           ("phrases", "slabika"),
    "spočítaj predmety": ("phrases", "spocitaj-predmety"),
    "áno je ich":        ("phrases", "ano-je-ich"),
    "nie je ich":        ("phrases", "nie-je-ich"),
    "výborne":           ("praise",  "vyborne"),
    "skvelá práca":      ("praise",  "skvela-praca"),
    "si šikovný":        ("praise",  "si-sikovny"),
    "si šikovná":        ("praise",  "si-sikovny"),
    "to je ono":         ("praise",  "to-je-ono"),
    "úžasné":            ("praise",  "uzasne"),
    "paráda":            ("praise",  "parada"),
}


# ── Silence detection + splitting ─────────────────────────────────────────────

def get_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


def detect_silences(path, noise=SILENCE_NOISE_DB, min_dur=0.5):
    r = subprocess.run(
        ["ffmpeg", "-i", path,
         "-af", f"silencedetect=noise={noise}:d={min_dur}",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)",   r.stderr)]
    return list(zip(starts, ends))


def silences_to_segments(silences, total):
    segs = []
    if not silences:
        return [(0.0, total)]
    if silences[0][0] > MIN_SPEECH_DURATION:
        segs.append((0.0, silences[0][0]))
    for i in range(len(silences) - 1):
        s, e = silences[i][1], silences[i + 1][0]
        if e - s > MIN_SPEECH_DURATION:
            segs.append((s, e))
    if total - silences[-1][1] > MIN_SPEECH_DURATION:
        segs.append((silences[-1][1], total))
    return segs


def extract_segment(src, start, end, dest, total):
    """Export one speech segment to an mp3 file."""
    ts = max(0.0, start - PADDING)
    te = min(total, end + PADDING)
    subprocess.run(
        ["ffmpeg", "-y", "-i", src,
         "-ss", str(ts), "-t", str(te - ts),
         "-q:a", "2", "-codec:a", "libmp3lame", dest],
        capture_output=True,
    )


def split_to_temp(src, silence_dur):
    """Split src into temp mp3 files; return list of (start, end, temp_path)."""
    total    = get_duration(src)
    silences = detect_silences(src, min_dur=silence_dur)
    segs     = silences_to_segments(silences, total)
    tmp_dir  = tempfile.mkdtemp(prefix="teo_split_")
    results  = []
    for i, (s, e) in enumerate(segs):
        tmp = os.path.join(tmp_dir, f"{i+1:03d}.mp3")
        extract_segment(src, s, e, tmp, total)
        results.append((s, e, tmp))
    return results, tmp_dir


# ── Gemini transcription ───────────────────────────────────────────────────────

def transcribe(audio_path, prompt, retries=3):
    """Send audio clip to Gemini and return the raw text response."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set. Export it before running.")

    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode()

    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "audio/mp3", "data": audio_b64}},
                {"text": prompt},
            ]
        }],
        "generationConfig": {"temperature": 0.0},
    }

    url = GEMINI_URL.format(key=GEMINI_API_KEY)
    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 30))
                print(f"      ↩ rate-limited — sleeping {wait}s…")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                raise
            print(f"      ↩ retry ({e})…")
            time.sleep(2 ** attempt)


# ── Mapping helpers ────────────────────────────────────────────────────────────

def _normalise(s):
    """Lowercase + strip diacritics for map lookup."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )

def map_number(text):
    """'dva' → '2'"""
    t = text.strip().lower()
    # direct digit match
    if t.isdigit() and 1 <= int(t) <= 20:
        return t
    # word match (try longest match first)
    for word, digit in sorted(NUMBER_MAP.items(), key=lambda x: -len(x[0])):
        if word in t:
            return digit
    return None


def map_letter(text):
    """'č' or 'Č' → 'c-caron'"""
    _SK_CHARS = r"[^a-záäčďdždzéfghiíjkľĺlmnňoóôpqrŕsšťtuúvwxyýzž]"
    t = text.strip().lower()
    t_stripped = re.sub(_SK_CHARS, "", t)
    by_len = sorted(LETTER_MAP.items(), key=lambda x: -len(x[0]))

    # pass 1: exact match on full stripped string
    for letter, key in by_len:
        if t_stripped == letter:
            return key

    # pass 2: exact match per whitespace token (handles "písmeno DŽ")
    for token in t.split():
        tok = re.sub(_SK_CHARS, "", token)
        for letter, key in by_len:
            if tok == letter:
                return key

    # pass 3: substring fallback (last resort)
    for letter, key in by_len:
        if letter in t_stripped:
            return key

    return None


def map_phrase(text):
    """'Výborne!' → ('praise', 'vyborne')"""
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


# ── Main processing ────────────────────────────────────────────────────────────

def process_numbers(src, overwrite=False):
    print("\n" + "═" * 60)
    print(f"ČÍSLA (numbers 1–20)  ←  {os.path.basename(src)}")
    print("═" * 60)

    segs, tmp_dir = split_to_temp(src, SILENCE_DUR["numbers"])
    out_dir = os.path.join(OUTPUT_BASE, "numbers")
    os.makedirs(out_dir, exist_ok=True)

    prompt = (
        "This audio clip contains a single Slovak number spoken aloud. "
        "Return ONLY the number as an arabic digit (e.g. 1, 2, 3 … 20). "
        "Do not add any other text."
    )

    unmatched = []
    try:
        for start, end, tmp in segs:
            dur = end - start
            text = transcribe(tmp, prompt)
            key  = map_number(text)
            marker = "✓" if key else "✗"
            dest = os.path.join(out_dir, f"{key}.mp3") if key else None
            print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  transcribed: {text!r}  → {key}.mp3")

            if key:
                if not overwrite and os.path.exists(dest):
                    print(f"      – skipping {dest} (exists, use --overwrite)")
                else:
                    shutil.copy2(tmp, dest)
            else:
                unmatched.append((tmp, text, dur))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    _report_unmatched(unmatched, "numbers")


def process_letters(src, overwrite=False):
    print("\n" + "═" * 60)
    print(f"PÍSMENKÁ (letters)  ←  {os.path.basename(src)}")
    print("═" * 60)

    segs, tmp_dir = split_to_temp(src, SILENCE_DUR["letters"])
    out_dir = os.path.join(OUTPUT_BASE, "letters")
    os.makedirs(out_dir, exist_ok=True)

    prompt = (
        "This audio clip contains a single Slovak letter or digraph being pronounced. "
        "Return ONLY the letter (e.g. A, Á, B, C, Č, D, Ď, DZ, DŽ, E, É, F, G, H, CH, "
        "I, Í, J, K, L, Ľ, Ĺ, M, N, Ň, O, Ó, Ô, P, Q, R, Ŕ, S, Š, T, Ť, U, Ú, V, W, "
        "X, Y, Ý, Z, Ž). No other text."
    )

    unmatched = []
    try:
        for start, end, tmp in segs:
            dur  = end - start
            text = transcribe(tmp, prompt)
            key  = map_letter(text)
            marker = "✓" if key else "✗"
            dest = os.path.join(out_dir, f"{key}.mp3") if key else None
            print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  transcribed: {text!r}  → {key}.mp3")

            if key:
                if not overwrite and os.path.exists(dest):
                    print(f"      – skipping {dest} (exists, use --overwrite)")
                else:
                    shutil.copy2(tmp, dest)
            else:
                unmatched.append((tmp, text, dur))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    _report_unmatched(unmatched, "letters")


def process_phrases(src, overwrite=False):
    print("\n" + "═" * 60)
    print(f"VETY (phrases + praise)  ←  {os.path.basename(src)}")
    print("═" * 60)

    segs, tmp_dir = split_to_temp(src, SILENCE_DUR["phrases"])
    os.makedirs(os.path.join(OUTPUT_BASE, "phrases"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_BASE, "praise"),  exist_ok=True)

    prompt = (
        "This is a short Slovak audio clip from a children's educational app. "
        "Transcribe ONLY what is spoken — no punctuation, no explanation. "
        "The clip is one of: "
        "Nájdi písmenko | Toto je písmenko | Skús to znova | Číslo | Slabika | "
        "Spočítaj predmety | Áno je ich | Nie je ich | "
        "Výborne | Skvelá práca | Si šikovný | To je ono | Úžasné | Paráda"
    )

    unmatched = []
    try:
        for start, end, tmp in segs:
            dur  = end - start
            text = transcribe(tmp, prompt)
            match = map_phrase(text)
            marker = "✓" if match else "✗"

            if match:
                folder, key = match
                out_path = os.path.join(OUTPUT_BASE, folder, f"{key}.mp3")
                if not overwrite and os.path.exists(out_path):
                    print(f"  –  {start:.2f}-{end:.2f}s ({dur:.2f}s)  {text!r}  → skipping {folder}/{key}.mp3 (exists, use --overwrite)")
                else:
                    shutil.copy2(tmp, out_path)
                    print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  {text!r}  → {folder}/{key}.mp3")
            else:
                print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  {text!r}  → ??? (unmatched)")
                unmatched.append((tmp, text, dur))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    _report_unmatched(unmatched, "phrases")


def _report_unmatched(items, kind):
    if not items:
        return
    unmatched_dir = os.path.join(OUTPUT_BASE, "unmatched")
    os.makedirs(unmatched_dir, exist_ok=True)
    print(f"\n  ⚠  {len(items)} unmatched segment(s) saved to {unmatched_dir}/")
    for i, (tmp, text, dur) in enumerate(items, 1):
        dest = os.path.join(unmatched_dir, f"{kind}_{i:02d}.mp3")
        shutil.copy2(tmp, dest)
        print(f"      {dest}  ({dur:.2f}s)  transcribed as: {text!r}")


# ── Entry point ────────────────────────────────────────────────────────────────

def resolve_path(p):
    """Resolve a path relative to SCRIPT_DIR if not absolute."""
    if os.path.isabs(p):
        return p
    return os.path.join(SCRIPT_DIR, p)


def check_deps(files):
    if not GEMINI_API_KEY:
        sys.exit("✗  GEMINI_API_KEY is not set.\n   Run: GEMINI_API_KEY=AIza... python3 split_and_transcribe.py ...")
    for src in files:
        if not os.path.exists(src):
            sys.exit(f"✗  Source file not found: {src}")
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except FileNotFoundError:
        sys.exit("✗  ffmpeg not found. Install with: brew install ffmpeg")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Split and transcribe Slovak audio recordings into labelled mp3 clips."
    )
    parser.add_argument("--numbers", metavar="FILE", nargs="+", default=[],
                        help="audio file(s) containing spoken numbers 1–20")
    parser.add_argument("--letters", metavar="FILE", nargs="+", default=[],
                        help="audio file(s) containing spoken letters / digraphs")
    parser.add_argument("--phrases", metavar="FILE", nargs="+", default=[],
                        help="audio file(s) containing instruction phrases and praise")
    parser.add_argument("--overwrite", action="store_true",
                        help="overwrite existing output files (default: skip)")
    args = parser.parse_args()

    numbers_files = [resolve_path(p) for p in args.numbers]
    letters_files = [resolve_path(p) for p in args.letters]
    phrases_files = [resolve_path(p) for p in args.phrases]

    all_files = numbers_files + letters_files + phrases_files
    if not all_files:
        parser.print_help()
        sys.exit("\n✗  No input files specified.")

    check_deps(all_files)

    for src in numbers_files:
        process_numbers(src, args.overwrite)
    for src in letters_files:
        process_letters(src, args.overwrite)
    for src in phrases_files:
        process_phrases(src, args.overwrite)

    print("\n✅  All done. Files are in:", OUTPUT_BASE)