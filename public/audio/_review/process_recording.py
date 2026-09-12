#!/usr/bin/env python3
"""
process_recording.py
====================
Takes a continuous audio recording (e.g. m4a, wav, mp3), detects pauses,
splits into individual trimmed segments, and assigns them in order to the missing
audio items (words, syllables, phrases) directly into `public/audio/sk/...`.

Usage:
    python3 public/audio/_review/process_recording.py <path_to_audio_file>
    python3 public/audio/_review/process_recording.py <path_to_audio_file> --silence-dur 0.6
    python3 public/audio/_review/process_recording.py --print-prompts
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_BASE = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "sk"))

EXPECTED_SEQUENCE = [
    # Words (13)
    {"type": "words", "key": "raketa", "label": "Raketa"},
    {"type": "words", "key": "lietadlo", "label": "Lietadlo"},
    {"type": "words", "key": "autobus", "label": "Autobus"},
    {"type": "words", "key": "hasici", "label": "Hasiči"},
    {"type": "words", "key": "cibula", "label": "Cibuľa"},
    {"type": "words", "key": "kladivo", "label": "Kladivo"},
    {"type": "words", "key": "papagaj", "label": "Papagáj"},
    {"type": "words", "key": "husenica", "label": "Húsenica"},
    {"type": "words", "key": "cokolada", "label": "Čokoláda"},
    {"type": "words", "key": "limonada", "label": "Limonáda"},
    {"type": "words", "key": "televizor", "label": "Televízor"},
    {"type": "words", "key": "kukurica", "label": "Kukurica"},
    {"type": "words", "key": "katastrofa", "label": "Katastrofa"},
    # Syllables (25)
    {"type": "syllables", "key": "ke", "label": "KE"},
    {"type": "syllables", "key": "lie", "label": "LIE"},
    {"type": "syllables", "key": "dlo", "label": "DLO"},
    {"type": "syllables", "key": "bus", "label": "BUS"},
    {"type": "syllables", "key": "si", "label": "SI"},
    {"type": "syllables", "key": "ci", "label": "CI"},
    {"type": "syllables", "key": "bu", "label": "BU"},
    {"type": "syllables", "key": "ľa", "label": "ĽA"},
    {"type": "syllables", "key": "kla", "label": "KLA"},
    {"type": "syllables", "key": "pa", "label": "PA"},
    {"type": "syllables", "key": "gáj", "label": "GÁJ"},
    {"type": "syllables", "key": "hú", "label": "HÚ"},
    {"type": "syllables", "key": "se", "label": "SE"},
    {"type": "syllables", "key": "ni", "label": "NI"},
    {"type": "syllables", "key": "čo", "label": "ČO"},
    {"type": "syllables", "key": "lá", "label": "LÁ"},
    {"type": "syllables", "key": "li", "label": "LI"},
    {"type": "syllables", "key": "mo", "label": "MO"},
    {"type": "syllables", "key": "ná", "label": "NÁ"},
    {"type": "syllables", "key": "te", "label": "TE"},
    {"type": "syllables", "key": "le", "label": "LE"},
    {"type": "syllables", "key": "ví", "label": "VÍ"},
    {"type": "syllables", "key": "zor", "label": "ZOR"},
    {"type": "syllables", "key": "ri", "label": "RI"},
    {"type": "syllables", "key": "stro", "label": "STRO"},
    # Phrases (2)
    {"type": "phrases", "key": "kde-je-viac", "label": "Kde je viac?"},
    {"type": "phrases", "key": "kolko-je-dokopy", "label": "Koľko je dokopy?"},
]

MIN_SPEECH_DURATION = 0.15
SILENCE_NOISE_DB = "-32dB"
PADDING = 0.06
DEFAULT_SILENCE_DUR = 0.6


def check_ffmpeg():
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        sys.exit("Error: 'ffmpeg' and 'ffprobe' are required. Install with: brew install ffmpeg")


def get_duration(path):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "quiet",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def detect_silences(path, noise=SILENCE_NOISE_DB, min_dur=DEFAULT_SILENCE_DUR):
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            path,
            "-af",
            f"silencedetect=noise={noise}:d={min_dur}",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", result.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", result.stderr)]
    return list(zip(starts, ends))


def silences_to_segments(silences, total):
    segments = []
    if not silences:
        return [(0.0, total)]

    if silences[0][0] > MIN_SPEECH_DURATION:
        segments.append((0.0, silences[0][0]))

    for i in range(len(silences) - 1):
        start = silences[i][1]
        end = silences[i + 1][0]
        if end - start > MIN_SPEECH_DURATION:
            segments.append((start, end))

    if total - silences[-1][1] > MIN_SPEECH_DURATION:
        segments.append((silences[-1][1], total))

    return segments


def extract_segment(src, start, end, dest, total):
    export_start = max(0.0, start - PADDING)
    export_end = min(total, end + PADDING)
    duration = export_end - export_start

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            f"{export_start:.3f}",
            "-t",
            f"{duration:.3f}",
            "-i",
            src,
            "-vn",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            "-ar",
            "44100",
            dest,
        ],
        check=True,
        capture_output=True,
    )


def print_prompts():
    print("\n" + "=" * 60)
    print("ZOZNAM NA NAHRÁVANIE (prečítaj za sebou s ~1s pauzou)")
    print("=" * 60)
    for idx, item in enumerate(EXPECTED_SEQUENCE, 1):
        cat = item["type"].upper()
        print(f"{idx:02d}. [{cat:9s}] {item['label']}")
    print("=" * 60)
    print(f"Spolu: {len(EXPECTED_SEQUENCE)} položiek\n")


def main():
    parser = argparse.ArgumentParser(description="Process continuous recording into Teo-Learn mp3 files.")
    parser.add_argument("input_file", nargs="?", help="Path to continuous audio file (m4a, mp3, wav, ...)")
    parser.add_argument("--silence-dur", type=float, default=DEFAULT_SILENCE_DUR, help="Minimum silence duration (default: 0.6s)")
    parser.add_argument("--noise", default=SILENCE_NOISE_DB, help="Noise threshold in dB (default: -32dB)")
    parser.add_argument("--print-prompts", action="store_true", help="Print recording checklist and exit")
    parser.add_argument("--apply", action="store_true", help="Automatically copy to public/audio/sk/ without asking")

    args = parser.parse_args()

    if args.print_prompts or not args.input_file:
        print_prompts()
        if not args.input_file:
            print("Tip: Spusti 'python3 public/audio/_review/process_recording.py <subor.m4a>' keď nahráš zvuk.")
        return

    check_ffmpeg()
    input_path = os.path.abspath(args.input_file)
    if not os.path.exists(input_path):
        sys.exit(f"Error: File not found: {input_path}")

    print(f"Analyzing audio: {input_path}")
    total_duration = get_duration(input_path)
    print(f"Total duration: {total_duration:.1f}s")

    silences = detect_silences(input_path, noise=args.noise, min_dur=args.silence_dur)
    segments = silences_to_segments(silences, total_duration)

    print(f"Detected {len(segments)} audio segments (expected {len(EXPECTED_SEQUENCE)}).")

    temp_dir = tempfile.mkdtemp(prefix="teo_audio_")
    try:
        extracted = []
        for i, (start, end) in enumerate(segments):
            dest_file = os.path.join(temp_dir, f"seg_{i+1:03d}.mp3")
            extract_segment(input_path, start, end, dest_file, total_duration)
            extracted.append(dest_file)

        print("\nExtracted segments mapping preview:")
        print("-" * 75)
        for i, item in enumerate(EXPECTED_SEQUENCE):
            if i < len(extracted):
                dur = get_duration(extracted[i])
                seg_label = f"seg_{i+1:03d}.mp3 ({dur:.2f}s)"
                target_path = f"public/audio/sk/{item['type']}/{item['key']}.mp3"
                print(f"{i+1:02d}. {item['label']:<15} -> {seg_label:<20} => {target_path}")
            else:
                print(f"{i+1:02d}. {item['label']:<15} -> [CHÝBA SEGMENT!]")

        if len(segments) > len(EXPECTED_SEQUENCE):
            print(f"\nUPOZORNENIE: Našlo sa o {len(segments) - len(EXPECTED_SEQUENCE)} segmentov viac, než sa očakávalo.")
            print("Skús upraviť parameter --silence-dur (napr. 0.7 alebo 0.8) alebo --noise.")
        elif len(segments) < len(EXPECTED_SEQUENCE):
            print(f"\nUPOZORNENIE: Našlo sa o {len(EXPECTED_SEQUENCE) - len(segments)} segmentov menej.")
            print("Skús znížiť parameter --silence-dur (napr. 0.5) alebo skontrolovať nahrávku.")

        dest_review_dir = os.path.join(SCRIPT_DIR, "_new", os.path.splitext(os.path.basename(input_path))[0])
        os.makedirs(dest_review_dir, exist_ok=True)
        for i, f in enumerate(extracted):
            shutil.copy2(f, os.path.join(dest_review_dir, f"{i+1:03d}.mp3"))
        print(f"\nVšetky vyextrahované klipy boli uložené aj do:\n  {dest_review_dir}")

        if not args.apply:
            reply = input("\nChceš skopírovať segmenty priamo do public/audio/sk/? (a/n): ").strip().lower()
            if reply not in ("a", "ano", "y", "yes"):
                print("Operácia zrušená. Klipy zostali v priečinku _new na manuálnu kontrolu.")
                return

        applied = 0
        for i, item in enumerate(EXPECTED_SEQUENCE):
            if i < len(extracted):
                dest = os.path.join(AUDIO_BASE, item["type"], f"{item['key']}.mp3")
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copy2(extracted[i], dest)
                applied += 1

        print(f"\nÚspešne skopírovaných {applied} súborov do public/audio/sk/!")
        print("Spúšťam audit audia: npm run test:audio")
        subprocess.run(["npm", "run", "test:audio"], cwd=os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..")))

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
