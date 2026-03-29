#!/usr/bin/env python3
"""
split_and_transcribe.py
=======================
Splits the three m4a voice recordings into individual mp3 files,
transcribes each clip with Gemini, maps the transcription to the
correct audioKey filename, and places each file under public/audio/.

Usage:
    GEMINI_API_KEY=AIza... python3 split_and_transcribe.py

Requirements:
    pip install requests
    ffmpeg  (brew install ffmpeg on Mac)

The script writes to these folders (created automatically):
    public/audio/numbers/     ← Čísla.m4a
    public/audio/letters/     ← Písmenká.m4a
    public/audio/phrases/     ← Vety.m4a (instruction phrases)
    public/audio/praise/      ← Vety.m4a (praise exclamations)
"""

import os, sys, re, json, base64, time, shutil, subprocess, tempfile
import requests

# ── User config — edit these paths if needed ─────────────────────────────────

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(SCRIPT_DIR, "uploads")   # folder with the .m4a files
OUTPUT_BASE = os.path.join(SCRIPT_DIR, "public", "audio")

# If the m4a files are elsewhere, override here:
CISLA_SRC    = os.path.join(UPLOADS_DIR, "Čísla.m4a")
PISMENA_SRC  = os.path.join(UPLOADS_DIR, "Písmenká.m4a")
VETY_SRC     = os.path.join(UPLOADS_DIR, "Vety.m4a")

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

# Slovak phrase text (lowercase, stripped) → (subfolder, audioKey)
PHRASE_MAP = {
    "nájdi písmenko":        ("phrases", "najdi-pismeno"),
    "nájdi pismenko":        ("phrases", "najdi-pismeno"),
    "toto je písmenko":      ("phrases", "toto-je-pismeno"),
    "toto je pismenko":      ("phrases", "toto-je-pismeno"),
    "skús to znova":         ("phrases", "skus-to-znova"),
    "skus to znova":         ("phrases", "skus-to-znova"),
    "číslo":                 ("phrases", "cislo"),
    "cislo":                 ("phrases", "cislo"),
    "slabika":               ("phrases", "slabika"),
    "spočítaj predmety":     ("phrases", "spocitaj-predmety"),
    "spocitaj predmety":     ("phrases", "spocitaj-predmety"),
    "áno je ich":            ("phrases", "ano-je-ich"),
    "ano je ich":            ("phrases", "ano-je-ich"),
    "nie je ich":            ("phrases", "nie-je-ich"),
    "výborne":               ("praise",  "vyborne"),
    "vyborne":               ("praise",  "vyborne"),
    "skvelá práca":          ("praise",  "skvela-praca"),
    "skvela praca":          ("praise",  "skvela-praca"),
    "si šikovný":            ("praise",  "si-sikovny"),
    "si šikovná":            ("praise",  "si-sikovny"),
    "si sikovny":            ("praise",  "si-sikovny"),
    "to je ono":             ("praise",  "to-je-ono"),
    "úžasné":                ("praise",  "uzasne"),
    "uzasne":                ("praise",  "uzasne"),
    "paráda":                ("praise",  "parada"),
    "parada":                ("praise",  "parada"),
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
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"      ↩ retry ({e})…")
            time.sleep(2 ** attempt)


# ── Mapping helpers ────────────────────────────────────────────────────────────

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
    t = text.strip().lower()
    # strip punctuation / spaces
    t = re.sub(r"[^a-záäčďdždzéfghiíjkľĺlmnňoóôpqrŕsšťtuúvwxyýzž]", "", t)
    # try longest match first (catches 'dž' before 'd')
    for letter, key in sorted(LETTER_MAP.items(), key=lambda x: -len(x[0])):
        if t == letter:
            return key
    # sometimes Gemini says "písmeno X" — grab just the letter part
    for letter, key in sorted(LETTER_MAP.items(), key=lambda x: -len(x[0])):
        if letter in t:
            return key
    return None


def map_phrase(text):
    """'Výborne!' → ('praise', 'vyborne')"""
    t = re.sub(r"[!?.,]", "", text.strip().lower())
    # exact match
    if t in PHRASE_MAP:
        return PHRASE_MAP[t]
    # partial / fuzzy match
    for key, val in PHRASE_MAP.items():
        if key in t or t in key:
            return val
    return None


# ── Main processing ────────────────────────────────────────────────────────────

def process_numbers():
    print("\n" + "═" * 60)
    print("ČÍSLA (numbers 1–20)")
    print("═" * 60)

    segs, tmp_dir = split_to_temp(CISLA_SRC, SILENCE_DUR["numbers"])
    out_dir = os.path.join(OUTPUT_BASE, "numbers")
    os.makedirs(out_dir, exist_ok=True)

    prompt = (
        "This audio clip contains a single Slovak number spoken aloud. "
        "Return ONLY the number as an arabic digit (e.g. 1, 2, 3 … 20). "
        "Do not add any other text."
    )

    unmatched = []
    for start, end, tmp in segs:
        dur = end - start
        text = transcribe(tmp, prompt)
        key  = map_number(text)
        marker = "✓" if key else "✗"
        print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  transcribed: {text!r}  → {key}.mp3")

        if key:
            shutil.copy2(tmp, os.path.join(out_dir, f"{key}.mp3"))
        else:
            unmatched.append((tmp, text, dur))

    shutil.rmtree(tmp_dir)
    _report_unmatched(unmatched)


def process_letters():
    print("\n" + "═" * 60)
    print("PÍSMENKÁ (letters)")
    print("═" * 60)

    segs, tmp_dir = split_to_temp(PISMENA_SRC, SILENCE_DUR["letters"])
    out_dir = os.path.join(OUTPUT_BASE, "letters")
    os.makedirs(out_dir, exist_ok=True)

    prompt = (
        "This audio clip contains a single Slovak letter or digraph being pronounced. "
        "Return ONLY the letter (e.g. A, Á, B, C, Č, D, Ď, DZ, DŽ, E, É, F, G, H, CH, "
        "I, Í, J, K, L, Ľ, Ĺ, M, N, Ň, O, Ó, Ô, P, Q, R, Ŕ, S, Š, T, Ť, U, Ú, V, W, "
        "X, Y, Ý, Z, Ž). No other text."
    )

    unmatched = []
    for start, end, tmp in segs:
        dur  = end - start
        text = transcribe(tmp, prompt)
        key  = map_letter(text)
        marker = "✓" if key else "✗"
        print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  transcribed: {text!r}  → {key}.mp3")

        if key:
            shutil.copy2(tmp, os.path.join(out_dir, f"{key}.mp3"))
        else:
            unmatched.append((tmp, text, dur))

    shutil.rmtree(tmp_dir)
    _report_unmatched(unmatched)


def process_phrases():
    print("\n" + "═" * 60)
    print("VETY (phrases + praise)")
    print("═" * 60)

    segs, tmp_dir = split_to_temp(VETY_SRC, SILENCE_DUR["phrases"])
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
    for start, end, tmp in segs:
        dur  = end - start
        text = transcribe(tmp, prompt)
        match = map_phrase(text)
        marker = "✓" if match else "✗"

        if match:
            folder, key = match
            out_path = os.path.join(OUTPUT_BASE, folder, f"{key}.mp3")
            shutil.copy2(tmp, out_path)
            print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  {text!r}  → {folder}/{key}.mp3")
        else:
            print(f"  {marker}  {start:.2f}-{end:.2f}s ({dur:.2f}s)  {text!r}  → ??? (unmatched)")
            unmatched.append((tmp, text, dur))

    shutil.rmtree(tmp_dir)
    _report_unmatched(unmatched)


def _report_unmatched(items):
    if not items:
        return
    print(f"\n  ⚠  {len(items)} unmatched segment(s) — check manually:")
    for tmp, text, dur in items:
        print(f"      {dur:.2f}s  transcribed as: {text!r}")


# ── Entry point ────────────────────────────────────────────────────────────────

def check_deps():
    if not GEMINI_API_KEY:
        sys.exit("✗  GEMINI_API_KEY is not set.\n   Run: GEMINI_API_KEY=AIza... python3 split_and_transcribe.py")
    for src in [CISLA_SRC, PISMENA_SRC, VETY_SRC]:
        if not os.path.exists(src):
            sys.exit(f"✗  Source file not found: {src}\n   Edit UPLOADS_DIR at the top of this script.")
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except FileNotFoundError:
        sys.exit("✗  ffmpeg not found. Install with: brew install ffmpeg")


if __name__ == "__main__":
    check_deps()
    process_numbers()
    process_letters()
    process_phrases()
    print("\n✅  All done. Files are in:", OUTPUT_BASE)
