#!/usr/bin/env python3
"""Generate baseball cap reference PNGs for Meshy multi-image input."""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "meshy_output" / "reference_images" / "hat_baseball_cap_v1"
API_URL = "https://api.openai.com/v1/images/generations"


VIEWS = {
    "front.png": (
        "straight-on front view of the cap, centered and symmetrical, "
        "short rounded brim pointing directly toward the viewer"
    ),
    "side.png": (
        "clean left-side profile view of the cap, brim pointing to the right, "
        "rounded crown silhouette visible"
    ),
    "back.png": (
        "straight-on back view of the cap, no brim visible at all, rounded back crown"
    ),
    "threequarter.png": (
        "three-quarter view from the front-left, showing the front panel and the "
        "short brim angled toward the lower right"
    ),
}


BASE_PROMPT = """
Create a clean reference image for 3D modeling: exactly one stylized baseball cap,
no head, no person, no neck, no body. The same preschool-safe cap design in every
view: simple rounded soft toy-like geometry, rounded crown, short rounded
brim/visor, smooth soft curves only, no sharp edges. Solid bright red panels,
simple high-contrast geometry detection, very minimal shading, no texture noise.
Plain pure white background. No text, no logos, no brand marks, no laces, no
stitch decorations, no buttons, no labels, no patterns, no extra objects.
Object centered, fully visible, isolated, consistent scale, orthographic product
reference style, PNG.
""".strip()


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


def request_image(prompt: str, api_key: str) -> bytes:
    payload = {
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": "high",
        "output_format": "png",
        "background": "opaque",
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API returned HTTP {exc.code}: {details}") from exc

    data = json.loads(body)
    first = data["data"][0]
    if "b64_json" in first and first["b64_json"]:
        return base64.b64decode(first["b64_json"])
    if "url" in first and first["url"]:
        with urllib.request.urlopen(first["url"], timeout=180) as image_response:
            return image_response.read()
    raise RuntimeError(f"Unexpected image response shape: {json.dumps(data)[:500]}")


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY is not set in the environment or repo .env.", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for filename, view_prompt in VIEWS.items():
        output_path = OUTPUT_DIR / filename
        prompt = f"{BASE_PROMPT}\n\nRequired view: {view_prompt}."
        print(f"Generating {filename}...")
        image_bytes = request_image(prompt, api_key)
        output_path.write_bytes(image_bytes)
        print(f"Saved {output_path.relative_to(ROOT)} ({len(image_bytes)} bytes)")
        time.sleep(1)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
