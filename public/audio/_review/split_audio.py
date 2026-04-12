#!/usr/bin/env python3
"""
split_audio.py
==============
Splits long m4a voice recordings into individual mp3 clips for manual review.

Transcription and automatic filename mapping were removed because they proved
too unreliable for production use. The script now does one job only: detect
silences and export each spoken segment.

Usage:
    python3 split_audio.py "Písmenká.m4a" "Dz, dž.m4a"
    python3 split_audio.py "Čísla.m4a" --silence-dur 0.8

Paths can be absolute or relative to the script directory.

Arguments:
    FILE [FILE ...]             recording files to split
    --silence-dur SECONDS       minimum silence duration used for split detection

Output is written to _new/ next to this script:
    _new/<source-name>/

Each source directory contains:
    001.mp3, 002.mp3, ...

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

# ── Paths ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BASE = os.path.join(SCRIPT_DIR, "_new")

# ── Audio split parameters ────────────────────────────────────────────────────

MIN_SPEECH_DURATION = 0.10
SILENCE_NOISE_DB = "-35dB"
PADDING = 0.05
DEFAULT_SILENCE_DUR = 0.5


# ── Silence detection + splitting ─────────────────────────────────────────────

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


def detect_silences(path, noise=SILENCE_NOISE_DB, min_dur=0.5):
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
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            src,
            "-ss",
            str(export_start),
            "-t",
            str(export_end - export_start),
            "-q:a",
            "2",
            "-codec:a",
            "libmp3lame",
            dest,
        ],
        capture_output=True,
        check=True,
    )


def split_to_temp(src, silence_dur):
    total = get_duration(src)
    silences = detect_silences(src, min_dur=silence_dur)
    segments = silences_to_segments(silences, total)
    tmp_dir = tempfile.mkdtemp(prefix="teo_split_")
    results = []

    for i, (start, end) in enumerate(segments, start=1):
        tmp_path = os.path.join(tmp_dir, f"{i:03d}.mp3")
        extract_segment(src, start, end, tmp_path, total)
        results.append((i, start, end, tmp_path))

    return results, tmp_dir


# ── Export helpers ────────────────────────────────────────────────────────────

def make_slug(name):
    stem, _ext = os.path.splitext(os.path.basename(name))
    slug = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-").lower()
    return slug or "recording"


def export_segments(src, silence_dur):
    print("\n" + "═" * 60)
    print(f"SPLITTING  ←  {os.path.basename(src)}")
    print("═" * 60)

    segments, tmp_dir = split_to_temp(src, silence_dur)
    recording_dir = os.path.join(OUTPUT_BASE, make_slug(src))
    os.makedirs(recording_dir, exist_ok=True)

    try:
        for index, start, end, tmp_path in segments:
            duration = end - start
            filename = f"{index:03d}.mp3"
            destination = os.path.join(recording_dir, filename)
            shutil.copy2(tmp_path, destination)
            print(f"  ✓  {filename}  {start:.2f}-{end:.2f}s  ({duration:.2f}s)")

        print(f"\n  Wrote {len(segments)} clips to {recording_dir}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── Entry point ────────────────────────────────────────────────────────────────

def resolve_path(path):
    if os.path.isabs(path):
        return path
    return os.path.join(SCRIPT_DIR, path)


def check_deps(files):
    for src in files:
        if not os.path.exists(src):
            sys.exit(f"✗  Source file not found: {src}")

    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        subprocess.run(["ffprobe", "-version"], capture_output=True, check=True)
    except FileNotFoundError:
        sys.exit("✗  ffmpeg/ffprobe not found. Install with: brew install ffmpeg")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Split Slovak audio recordings into numbered mp3 clips for manual review."
    )
    parser.add_argument(
        "files",
        metavar="FILE",
        nargs="*",
        help="recording file(s) to split",
    )
    parser.add_argument(
        "--silence-dur",
        type=float,
        default=DEFAULT_SILENCE_DUR,
        help=f"minimum silence duration in seconds before splitting (default: {DEFAULT_SILENCE_DUR})",
    )
    args = parser.parse_args()

    input_files = [resolve_path(path) for path in args.files]
    if not input_files:
        parser.print_help()
        sys.exit("\n✗  No input files specified.")

    check_deps(input_files)

    for src in input_files:
        export_segments(src, args.silence_dur)

    print("\n✅  All done. Files are in:", OUTPUT_BASE)
