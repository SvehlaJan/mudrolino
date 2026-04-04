#!/usr/bin/env python3
"""
Run with: python3 test_mappings.py
"""
from split_and_transcribe import map_letter, map_number, map_phrase

# ── map_letter ────────────────────────────────────────────────────────────────
assert map_letter("DŽ")             == "dzh",          "uppercase digraph DŽ"
assert map_letter("dž")             == "dzh",          "lowercase digraph dž"
assert map_letter("DZ")             == "dz",           "digraph DZ"
assert map_letter("dz")             == "dz",           "digraph dz"
assert map_letter("Á")              == "a-acute",      "accented vowel Á"
assert map_letter("á")              == "a-acute",      "accented vowel á"
assert map_letter("písmeno Á")      == "a-acute",      "Gemini prefix + accented Á"
assert map_letter("písmeno DŽ")     == "dzh",          "Gemini prefix + digraph DŽ"
assert map_letter("písmeno dž")     == "dzh",          "Gemini prefix + digraph dž"
assert map_letter("CH")             == "ch",           "digraph CH"
assert map_letter("ch")             == "ch",           "digraph ch"
assert map_letter("Ľ")              == "l-caron",      "l-caron"
assert map_letter("A")              == "a",            "plain A"
assert map_letter("Ž")              == "z-caron",      "ž"
assert map_letter("Ô")              == "o-circumflex", "ô"

# ── map_number ────────────────────────────────────────────────────────────────
assert map_number("dva")            == "2",   "word dva"
assert map_number("Dva")            == "2",   "capitalised Dva"
assert map_number("dvadsať")        == "20",  "dvadsať"
assert map_number("15")             == "15",  "digit 15"
assert map_number("pätnásť")        == "15",  "pätnásť"
assert map_number("1")              == "1",   "digit 1"
assert map_number("jeden")          == "1",   "jeden"
assert map_number("sedem")          == "7",   "sedem"

# ── map_phrase ────────────────────────────────────────────────────────────────
assert map_phrase("Výborne!")              == ("praise",  "vyborne"),       "praise with diacritics"
assert map_phrase("Skvelá práca")          == ("praise",  "skvela-praca"),  "skvelá práca"
assert map_phrase("Nájdi písmenko")        == ("phrases", "najdi-pismeno"), "phrase with diacritics"
assert map_phrase("Toto je písmenko")      == ("phrases", "toto-je-pismeno")
assert map_phrase("Skús to znova")         == ("phrases", "skus-to-znova")
assert map_phrase("Spočítaj predmety")     == ("phrases", "spocitaj-predmety")
assert map_phrase("Áno je ich")            == ("phrases", "ano-je-ich")
assert map_phrase("Nie je ich")            == ("phrases", "nie-je-ich")

print("All assertions passed ✓")
