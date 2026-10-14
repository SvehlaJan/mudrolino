#!/usr/bin/env python3
"""
process_recording.py
====================
Splits one recorded take into clips at the pauses and files them, in order, as
the clips listed in a session file from `npm run audio:sessions`.

Usage:
    npm run audio:sessions -- --locale cs      # plan takes and print the script
    python3 tools/audio/process_recording.py take.m4a --session tools/audio/sessions/cs-06-words-1.tsv
    python3 tools/audio/process_recording.py take.m4a --session ... --silence-dur 0.8
    python3 tools/audio/process_recording.py --session ... --print-prompts

The split clips are always copied to tools/audio/_new/<session>/ for listening.
With --apply (or after confirming), they are written to public/audio/, the
pending list is updated (`npm run audio:sync-pending`) and `npm run test:audio`
runs. If the segment count differs from the session, nothing is written:
re-record the take or adjust --silence-dur.

Requirements:
    ffmpeg  (brew install ffmpeg on Mac)
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
AUDIO_ROOT = os.path.join(REPO_ROOT, "public", "audio")


def load_session(path):
    """Reads `relative/path.mp3<TAB>text to read` lines written by recording_sessions.ts."""
    items = []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.rstrip("\n")
            if not line:
                continue
            clip_path, _, label = line.partition("\t")
            if not re.fullmatch(r"[a-z]{2,3}/[a-z-]+/[^/]+\.mp3", clip_path):
                sys.exit(f"Error: unexpected clip path in session file: {clip_path!r}")
            items.append({"path": clip_path, "label": label or clip_path})
    if not items:
        sys.exit(f"Error: session file is empty: {path}")
    return items


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


def print_prompts(items, name):
    print("\n" + "=" * 60)
    print(f"{name}: prečítaj za sebou s ~1s pauzou")
    print("=" * 60)
    for idx, item in enumerate(items, 1):
        print(f"{idx:02d}. {item['label']}")
    print("=" * 60)
    print(f"Spolu: {len(items)} položiek\n")


def main():
    parser = argparse.ArgumentParser(description="Split a recorded take into Mudrolíno clips listed in a session file.")
    parser.add_argument("input_file", nargs="?", help="Recorded take (m4a, mp3, wav, ...)")
    parser.add_argument("--session", required=True, help="Session file from `npm run audio:sessions` (tools/audio/sessions/*.tsv)")
    parser.add_argument("--silence-dur", type=float, default=DEFAULT_SILENCE_DUR, help="Minimum silence duration (default: 0.6s)")
    parser.add_argument("--noise", default=SILENCE_NOISE_DB, help="Noise threshold in dB (default: -32dB)")
    parser.add_argument("--print-prompts", action="store_true", help="Print the session's script and exit")
    parser.add_argument("--apply", action="store_true", help="Write the clips to public/audio/ without asking")

    args = parser.parse_args()
    items = load_session(args.session)
    session_name = os.path.splitext(os.path.basename(args.session))[0]

    if args.print_prompts or not args.input_file:
        print_prompts(items, session_name)
        if not args.input_file:
            print(f"Tip: python3 tools/audio/process_recording.py <nahravka.m4a> --session {args.session}")
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
    print(f"Detected {len(segments)} audio segments (expected {len(items)}).")

    temp_dir = tempfile.mkdtemp(prefix="mudrolino_audio_")
    try:
        extracted = []
        for i, (start, end) in enumerate(segments):
            dest_file = os.path.join(temp_dir, f"seg_{i+1:03d}.mp3")
            extract_segment(input_path, start, end, dest_file, total_duration)
            extracted.append(dest_file)

        print("\nExtracted segments mapping preview:")
        print("-" * 75)
        for i, item in enumerate(items):
            if i < len(extracted):
                dur = get_duration(extracted[i])
                print(f"{i+1:02d}. {item['label']:<24} -> seg_{i+1:03d}.mp3 ({dur:.2f}s) => public/audio/{item['path']}")
            else:
                print(f"{i+1:02d}. {item['label']:<24} -> [CHÝBA SEGMENT!]")

        review_dir = os.path.join(SCRIPT_DIR, "_new", session_name)
        os.makedirs(review_dir, exist_ok=True)
        for i, f in enumerate(extracted):
            shutil.copy2(f, os.path.join(review_dir, f"{i+1:03d}.mp3"))
        print(f"\nVšetky vyextrahované klipy sú na vypočutie v:\n  {review_dir}")

        if len(segments) != len(items):
            difference = "viac" if len(segments) > len(items) else "menej"
            print(f"\nPočet segmentov nesedí ({len(segments)} namiesto {len(items)}, o {abs(len(segments) - len(items))} {difference}).")
            print("Nič sa nezapísalo: posunuté poradie by priradilo zlé zvuky.")
            print("Upravte --silence-dur (viac segmentov: skúste 0.8; menej: 0.5) alebo blok nahrajte znova.")
            sys.exit(1)

        if not args.apply:
            reply = input("\nZapísať klipy do public/audio/? (a/n): ").strip().lower()
            if reply not in ("a", "ano", "áno", "y", "yes"):
                print("Nič sa nezapísalo. Klipy zostali v priečinku _new na kontrolu.")
                return

        for item, clip in zip(items, extracted):
            dest = os.path.join(AUDIO_ROOT, item["path"])
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(clip, dest)

        print(f"\nZapísaných {len(items)} klipov do public/audio/.")
        subprocess.run(["npm", "run", "--silent", "audio:sync-pending"], cwd=REPO_ROOT, check=True)
        subprocess.run(["npm", "run", "--silent", "test:audio"], cwd=REPO_ROOT)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
