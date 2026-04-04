#!/usr/bin/env python3
"""
check_missing_audio.py
======================
Reports which audio files expected by the app are not yet present
in public/audio/.

Run from anywhere — paths are resolved relative to this script.

Usage:
    python3 check_missing_audio.py
"""

import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR  = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))  # public/audio/

# ── Expected files derived from contentRegistry.ts ───────────────────────────

LETTER_KEYS = [
    "a", "a-acute", "a-umlaut",
    "b",
    "c", "c-caron",
    "d", "d-caron",
    "dz", "dzh",
    "e", "e-acute",
    "f",
    "g",
    "h", "ch",
    "i", "i-acute",
    "j",
    "k",
    "l", "l-caron", "l-acute",
    "m",
    "n", "n-caron",
    "o", "o-acute", "o-circumflex",
    "p",
    "q",
    "r", "r-acute",
    "s", "s-caron",
    "t", "t-caron",
    "u", "u-acute",
    "v",
    "w",
    "x",
    "y", "y-acute",
    "z", "z-caron",
]

_SYLLABLE_CONSONANTS = ["m", "t", "l", "s", "p", "b", "v", "d", "n", "r", "k", "j"]
_SYLLABLE_VOWELS     = ["a", "e", "i", "o", "u"]
SYLLABLE_KEYS = [f"{c}{v}" for c in _SYLLABLE_CONSONANTS for v in _SYLLABLE_VOWELS]

NUMBER_KEYS = [str(i) for i in range(1, 21)]

PHRASE_KEYS = [
    "najdi-pismeno",
    "toto-je-pismeno",
    "skus-to-znova",
    "cislo",
    "slabika",
    "spocitaj-predmety",
    "ano-je-ich",
    "nie-je-ich",
]

PRAISE_KEYS = [
    "vyborne",
    "skvela-praca",
    "si-sikovny",
    "to-je-ono",
    "uzasne",
    "parada",
]

EXPECTED: dict[str, list[str]] = {
    "letters":   LETTER_KEYS,
    "syllables": SYLLABLE_KEYS,
    "numbers":   NUMBER_KEYS,
    "phrases":   PHRASE_KEYS,
    "praise":    PRAISE_KEYS,
}

# ── Check ─────────────────────────────────────────────────────────────────────

def check():
    total_expected = 0
    total_missing  = 0
    total_orphaned = 0

    for folder, keys in EXPECTED.items():
        expected_set = {f"{key}.mp3" for key in keys}
        folder_path  = os.path.join(AUDIO_DIR, folder)

        # Find missing expected files
        missing = [key for key in keys
                   if not os.path.isfile(os.path.join(folder_path, f"{key}.mp3"))]

        # Find files on disk that don't match any expected key
        orphaned = []
        if os.path.isdir(folder_path):
            for fname in sorted(os.listdir(folder_path)):
                if fname.endswith(".mp3") and fname not in expected_set and fname != ".gitkeep":
                    orphaned.append(fname)

        total_expected += len(keys)
        total_missing  += len(missing)
        total_orphaned += len(orphaned)

        parts = []
        if missing:
            parts.append(f"✗ {len(missing)}/{len(keys)} missing")
        if orphaned:
            parts.append(f"⚠ {len(orphaned)} unrecognised")
        status = "✓ all present" if not parts else ", ".join(parts)

        print(f"\n{folder}/  [{status}]")
        for key in missing:
            print(f"  ✗  {key}.mp3")
        for fname in orphaned:
            print(f"  ?  {fname}  (not in registry — possibly misnamed)")

    print()
    print("─" * 50)
    if total_missing == 0 and total_orphaned == 0:
        print(f"✅  All {total_expected} audio files are present.")
    else:
        present = total_expected - total_missing
        msg = f"⚠   {total_missing} missing, {present}/{total_expected} present."
        if total_orphaned:
            msg += f"  {total_orphaned} unrecognised file(s) on disk (check names)."
        print(msg)


if __name__ == "__main__":
    check()
