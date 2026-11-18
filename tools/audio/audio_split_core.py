"""Shared silence splitting mechanics; each recording CLI keeps its own profile."""

from dataclasses import dataclass
import re
import subprocess


@dataclass(frozen=True)
class SplitProfile:
    min_speech_duration: float
    silence_noise_db: str
    padding: float
    default_silence_dur: float
    session_export: bool


MANUAL_PROFILE = SplitProfile(0.10, "-35dB", 0.05, 0.5, False)
SESSION_PROFILE = SplitProfile(0.15, "-32dB", 0.06, 0.6, True)


def get_duration(path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def detect_silences(path, *, noise, min_dur):
    result = subprocess.run(
        [
            "ffmpeg", "-i", path, "-af",
            f"silencedetect=noise={noise}:d={min_dur}", "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", result.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", result.stderr)]
    return list(zip(starts, ends))


def silences_to_segments(silences, total, *, min_speech_duration):
    if not silences:
        return [(0.0, total)]

    segments = []
    if silences[0][0] > min_speech_duration:
        segments.append((0.0, silences[0][0]))

    for i in range(len(silences) - 1):
        start = silences[i][1]
        end = silences[i + 1][0]
        if end - start > min_speech_duration:
            segments.append((start, end))

    if total - silences[-1][1] > min_speech_duration:
        segments.append((silences[-1][1], total))
    return segments


def extract_segment(src, start, end, dest, total, *, profile):
    export_start = max(0.0, start - profile.padding)
    export_end = min(total, end + profile.padding)
    duration = export_end - export_start

    # Keep each CLI's historical seeking, timestamp formatting and encoding options.
    if profile.session_export:
        command = [
            "ffmpeg", "-y", "-ss", f"{export_start:.3f}", "-t", f"{duration:.3f}",
            "-i", src, "-vn", "-c:a", "libmp3lame", "-q:a", "2", "-ar", "44100", dest,
        ]
    else:
        command = [
            "ffmpeg", "-y", "-i", src, "-ss", str(export_start), "-t", str(duration),
            "-q:a", "2", "-codec:a", "libmp3lame", dest,
        ]
    subprocess.run(command, capture_output=True, check=True)
