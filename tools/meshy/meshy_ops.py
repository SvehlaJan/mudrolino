#!/usr/bin/env python3
"""Project-local Meshy helper CLI for 3D generation workflows."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import error, request


BASE_URL = "https://api.meshy.ai"
REQUEST_TIMEOUT_SECONDS = 180


class MeshyCliError(RuntimeError):
    """Raised for expected CLI failures."""


def stderr(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:40] or "task"


def load_api_key(cwd: Path) -> str:
    env_key = os.environ.get("MESHY_API_KEY", "").strip()
    if env_key:
        return env_key

    env_path = cwd / ".env"
    if not env_path.exists():
        return ""

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or not line.startswith("MESHY_API_KEY="):
            continue
        return line.split("=", 1)[1].strip().strip("'").strip('"')
    return ""


def output_root(cwd: Path) -> Path:
    root = cwd / "meshy_output"
    root.mkdir(parents=True, exist_ok=True)
    return root


def ensure_project_dir(cwd: Path, project_dir: Path) -> Path:
    resolved = project_dir.expanduser().resolve()
    root = output_root(cwd).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise MeshyCliError(f"Project directory must stay inside {root}") from exc
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def create_project_dir(cwd: Path, task_id: str, project_name: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = f"{timestamp}_{slugify(project_name)}_{task_id[:8]}"
    project_dir = output_root(cwd) / folder
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def record_task(
    *,
    cwd: Path,
    project_dir: Path,
    task_id: str,
    task_type: str,
    stage: str,
    project_name: str,
    files: list[str],
    extra: dict[str, Any] | None = None,
) -> None:
    metadata_path = project_dir / "metadata.json"
    metadata = read_json(
        metadata_path,
        {
            "project_name": project_name,
            "folder": project_dir.name,
            "root_task_id": task_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "tasks": [],
        },
    )
    metadata["project_name"] = metadata.get("project_name") or project_name
    metadata["updated_at"] = datetime.now().isoformat()
    task_entry = {
        "task_id": task_id,
        "task_type": task_type,
        "stage": stage,
        "files": files,
        "created_at": datetime.now().isoformat(),
    }
    if extra:
        task_entry["extra"] = extra
    metadata["tasks"].append(task_entry)
    write_json(metadata_path, metadata)

    history_path = output_root(cwd) / "history.json"
    history = read_json(history_path, {"version": 1, "projects": []})
    project_entry = next((item for item in history["projects"] if item["folder"] == project_dir.name), None)
    if project_entry is None:
        history["projects"].append(
            {
                "folder": project_dir.name,
                "project_name": project_name,
                "root_task_id": metadata["root_task_id"],
                "created_at": metadata["created_at"],
                "updated_at": metadata["updated_at"],
                "task_count": len(metadata["tasks"]),
            }
        )
    else:
        project_entry["updated_at"] = metadata["updated_at"]
        project_entry["task_count"] = len(metadata["tasks"])
    write_json(history_path, history)


def file_to_data_uri(path: Path) -> str:
    mime_type, _ = mimetypes.guess_type(path.name)
    if not mime_type:
        mime_type = "application/octet-stream"
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{payload}"


def coerce_image_input(value: str, cwd: Path) -> str:
    if value.startswith(("http://", "https://", "data:")):
        return value
    path = Path(value)
    if not path.is_absolute():
        path = cwd / path
    if not path.exists():
        raise MeshyCliError(f"Image path does not exist: {path}")
    return file_to_data_uri(path)


class MeshyClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def request_json(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
        req = request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method.upper())
        try:
            with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raw_body = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw_body) if raw_body else {}
            except json.JSONDecodeError:
                parsed = {"message": raw_body}
            self.raise_for_http_error(exc.code, parsed)
        except error.URLError as exc:
            raise MeshyCliError(f"Network error contacting Meshy: {exc.reason}") from exc
        raise AssertionError("unreachable")

    def download(self, url: str, destination: Path) -> None:
        req = request.Request(url, headers={"Authorization": f"Bearer {self.api_key}"}, method="GET")
        try:
            with request.urlopen(req, timeout=300) as response:
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open("wb") as handle:
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        handle.write(chunk)
        except error.HTTPError as exc:
            raise MeshyCliError(f"Download failed with HTTP {exc.code} for {destination.name}") from exc
        except error.URLError as exc:
            raise MeshyCliError(f"Download failed for {destination.name}: {exc.reason}") from exc

    def get_balance(self) -> dict[str, Any]:
        return self.request_json("GET", "/openapi/v1/balance")

    def create_task(self, endpoint: str, payload: dict[str, Any]) -> str:
        result = self.request_json("POST", endpoint, payload)
        task_id = result.get("result")
        if not task_id:
            raise MeshyCliError(f"Meshy did not return a task ID for {endpoint}")
        return task_id

    def fetch_task(self, endpoint: str, task_id: str) -> dict[str, Any]:
        result = self.request_json("GET", f"{endpoint}/{task_id}")
        if not isinstance(result, dict):
            raise MeshyCliError(f"Unexpected task payload for {task_id}")
        return result

    def poll_task(self, endpoint: str, task_id: str, timeout_seconds: int) -> dict[str, Any]:
        elapsed = 0
        delay = 5
        while elapsed < timeout_seconds:
            task = self.fetch_task(endpoint, task_id)
            status = task.get("status", "UNKNOWN")
            progress = int(task.get("progress", 0) or 0)
            stderr(f"[{status:>10}] {progress:3d}% task={task_id} elapsed={elapsed}s")
            if status == "SUCCEEDED":
                return task
            if status in {"FAILED", "CANCELED"}:
                message = (
                    task.get("task_error", {}).get("message")
                    or task.get("task_error")
                    or "Unknown Meshy task failure"
                )
                raise MeshyCliError(f"{status}: {message}")
            current_delay = 15 if progress >= 95 else delay
            time.sleep(current_delay)
            elapsed += current_delay
            if progress < 95:
                delay = min(int(delay * 1.5), 30)
        raise MeshyCliError(f"Timed out waiting for task {task_id}")

    def raise_for_http_error(self, status_code: int, payload: dict[str, Any]) -> None:
        message = payload.get("message") or payload.get("detail") or json.dumps(payload)
        if status_code == 401:
            raise MeshyCliError("Meshy rejected the API key (401). Check MESHY_API_KEY in env or repo-local .env.")
        if status_code == 402:
            balance = None
            try:
                balance = self.get_balance().get("balance")
            except MeshyCliError:
                balance = None
            suffix = f" Current balance: {balance}." if balance is not None else ""
            raise MeshyCliError(f"Meshy reported insufficient credits (402).{suffix}")
        if status_code == 422:
            raise MeshyCliError(f"Meshy could not process the request (422): {message}")
        if status_code == 429:
            raise MeshyCliError("Meshy rate-limited the request (429). Retry later.")
        if status_code >= 500:
            raise MeshyCliError(f"Meshy server error ({status_code}): {message}")
        raise MeshyCliError(f"Meshy request failed ({status_code}): {message}")


def require_api_key(cwd: Path) -> str:
    api_key = load_api_key(cwd)
    if not api_key:
        raise MeshyCliError(
            "MESHY_API_KEY is not set. Export it in the current shell or add it to a repo-local .env file."
        )
    return api_key


def require_confirmation(args: argparse.Namespace) -> None:
    if getattr(args, "confirm_spend", False):
        return
    raise MeshyCliError("This command spends credits. Re-run it with --confirm-spend after the user approves the cost.")


def maybe_download_thumbnail(client: MeshyClient, task: dict[str, Any], project_dir: Path) -> str | None:
    thumbnail_url = task.get("thumbnail_url")
    if not thumbnail_url:
        return None
    destination = project_dir / "thumbnail.png"
    try:
        client.download(thumbnail_url, destination)
    except MeshyCliError:
        return None
    return str(destination)


def format_paths(paths: list[Path]) -> list[str]:
    return [str(path) for path in paths]


def output_json(payload: dict[str, Any]) -> None:
    json.dump(payload, sys.stdout, indent=2, ensure_ascii=True)
    sys.stdout.write("\n")


def build_task_response(
    *,
    command: str,
    endpoint: str,
    task_id: str,
    project_dir: Path | None,
    task: dict[str, Any] | None,
    downloads: list[Path],
    balance: dict[str, Any] | None,
) -> dict[str, Any]:
    response: dict[str, Any] = {
        "command": command,
        "endpoint": endpoint,
        "task_id": task_id,
        "project_dir": str(project_dir) if project_dir else None,
        "downloads": format_paths(downloads),
    }
    if task is not None:
        response["status"] = task.get("status")
        if "model_urls" in task:
            response["available_formats"] = sorted(task["model_urls"].keys())
        response["task"] = task
    if balance is not None:
        response["balance"] = balance
    return response


def resolve_project_dir(args: argparse.Namespace, cwd: Path, task_id: str, project_name: str) -> Path:
    if getattr(args, "project_dir", None):
        return ensure_project_dir(cwd, Path(args.project_dir))
    return create_project_dir(cwd, task_id, project_name)


def maybe_wait_for_task(
    *,
    args: argparse.Namespace,
    client: MeshyClient,
    endpoint: str,
    task_id: str,
    cwd: Path,
    project_name: str,
    task_type: str,
    stage: str,
    download_callback,
) -> dict[str, Any]:
    if not args.wait:
        return build_task_response(
            command=args.command,
            endpoint=endpoint,
            task_id=task_id,
            project_dir=None,
            task=None,
            downloads=[],
            balance=None,
        )

    task = client.poll_task(endpoint, task_id, args.timeout_seconds)
    project_dir = resolve_project_dir(args, cwd, task_id, project_name)
    downloads = download_callback(task, project_dir)
    thumbnail_path = maybe_download_thumbnail(client, task, project_dir)
    extra = {
        "endpoint": endpoint,
        "status": task.get("status"),
        "available_formats": sorted(task.get("model_urls", {}).keys()) if isinstance(task.get("model_urls"), dict) else [],
        "thumbnail": thumbnail_path,
    }
    record_task(
        cwd=cwd,
        project_dir=project_dir,
        task_id=task_id,
        task_type=task_type,
        stage=stage,
        project_name=project_name,
        files=[path.name for path in downloads],
        extra=extra,
    )
    balance = client.get_balance()
    return build_task_response(
        command=args.command,
        endpoint=endpoint,
        task_id=task_id,
        project_dir=project_dir,
        task=task,
        downloads=downloads,
        balance=balance,
    )


def download_glb_from_model_urls(task: dict[str, Any], project_dir: Path, client: MeshyClient, filename: str) -> list[Path]:
    model_urls = task.get("model_urls") or {}
    glb_url = model_urls.get("glb")
    if not glb_url:
        raise MeshyCliError("Meshy did not return a .glb URL for this task.")
    destination = project_dir / filename
    client.download(glb_url, destination)
    return [destination]


def handle_balance(args: argparse.Namespace, cwd: Path) -> None:
    client = MeshyClient(require_api_key(cwd))
    output_json({"command": args.command, "balance": client.get_balance()})


def handle_text_to_3d_preview(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload: dict[str, Any] = {
        "mode": "preview",
        "prompt": args.prompt,
        "ai_model": args.ai_model,
    }
    if args.model_type:
        payload["model_type"] = args.model_type
    if args.topology:
        payload["topology"] = args.topology
    if args.target_polycount is not None:
        payload["target_polycount"] = args.target_polycount
    if args.should_remesh:
        payload["should_remesh"] = True
    if args.symmetry_mode:
        payload["symmetry_mode"] = args.symmetry_mode
    if args.pose_mode:
        payload["pose_mode"] = args.pose_mode

    endpoint = "/openapi/v2/text-to-3d"
    task_id = client.create_task(endpoint, payload)
    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or args.prompt,
        task_type="text-to-3d",
        stage="preview",
        download_callback=lambda task, project_dir: download_glb_from_model_urls(task, project_dir, client, "preview.glb")
        if args.download_glb
        else [],
    )
    output_json(response)


def handle_text_to_3d_refine(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload: dict[str, Any] = {
        "mode": "refine",
        "preview_task_id": args.preview_task_id,
        "enable_pbr": not args.disable_pbr,
        "ai_model": args.ai_model,
    }
    if args.texture_prompt:
        payload["texture_prompt"] = args.texture_prompt
    endpoint = "/openapi/v2/text-to-3d"
    task_id = client.create_task(endpoint, payload)
    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "refine",
        task_type="text-to-3d",
        stage="refine",
        download_callback=lambda task, project_dir: download_glb_from_model_urls(task, project_dir, client, "refined.glb")
        if args.download_glb
        else [],
    )
    output_json(response)


def handle_image_to_3d(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload: dict[str, Any] = {
        "image_url": coerce_image_input(args.image, cwd),
        "should_texture": not args.no_texture,
        "enable_pbr": not args.disable_pbr,
        "ai_model": args.ai_model,
    }
    endpoint = "/openapi/v1/image-to-3d"
    task_id = client.create_task(endpoint, payload)
    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "image-to-3d",
        task_type="image-to-3d",
        stage="complete",
        download_callback=lambda task, project_dir: download_glb_from_model_urls(task, project_dir, client, "model.glb")
        if args.download_glb
        else [],
    )
    output_json(response)


def handle_multi_image_to_3d(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload: dict[str, Any] = {
        "image_urls": [coerce_image_input(image, cwd) for image in args.image],
        "should_texture": not args.no_texture,
        "enable_pbr": not args.disable_pbr,
        "ai_model": args.ai_model,
    }
    endpoint = "/openapi/v1/multi-image-to-3d"
    task_id = client.create_task(endpoint, payload)
    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "multi-image-to-3d",
        task_type="multi-image-to-3d",
        stage="complete",
        download_callback=lambda task, project_dir: download_glb_from_model_urls(task, project_dir, client, "model.glb")
        if args.download_glb
        else [],
    )
    output_json(response)


def handle_retexture(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload: dict[str, Any] = {
        "enable_pbr": not args.disable_pbr,
    }
    if args.input_task_id:
        payload["input_task_id"] = args.input_task_id
    if args.model_url:
        payload["model_url"] = args.model_url
    if args.text_style:
        payload["text_style_prompt"] = args.text_style
    if args.image_style:
        payload["image_style_url"] = coerce_image_input(args.image_style, cwd)

    endpoint = "/openapi/v1/retexture"
    task_id = client.create_task(endpoint, payload)
    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "retexture",
        task_type="retexture",
        stage="complete",
        download_callback=lambda task, project_dir: download_glb_from_model_urls(task, project_dir, client, "retextured.glb")
        if args.download_glb
        else [],
    )
    output_json(response)


def handle_remesh(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload: dict[str, Any] = {
        "input_task_id": args.input_task_id,
        "target_formats": args.target_format,
    }
    if args.topology:
        payload["topology"] = args.topology
    if args.target_polycount is not None:
        payload["target_polycount"] = args.target_polycount

    endpoint = "/openapi/v1/remesh"
    task_id = client.create_task(endpoint, payload)
    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "remesh",
        task_type="remesh",
        stage="complete",
        download_callback=lambda task, project_dir: download_glb_from_model_urls(task, project_dir, client, "remeshed.glb")
        if args.download_glb
        else [],
    )
    output_json(response)


def handle_rig(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    source_task = client.fetch_task(args.source_endpoint, args.input_task_id)
    face_count = int(source_task.get("face_count", 0) or 0)
    if face_count > 300000:
        raise MeshyCliError(
            f"Rigging blocked because the source model has {face_count:,} faces. Remesh it below 300,000 first."
        )

    payload = {
        "input_task_id": args.input_task_id,
        "height_meters": args.height_meters,
    }
    endpoint = "/openapi/v1/rigging"
    task_id = client.create_task(endpoint, payload)

    def download_rig_outputs(task: dict[str, Any], project_dir: Path) -> list[Path]:
        if not args.download_glb:
            return []
        result = task.get("result") or {}
        downloads: list[Path] = []
        rigged_url = result.get("rigged_character_glb_url")
        if rigged_url:
            destination = project_dir / "rigged.glb"
            client.download(rigged_url, destination)
            downloads.append(destination)
        basic_animations = result.get("basic_animations") or {}
        for source_key, filename in (
            ("walking_glb_url", "walking.glb"),
            ("running_glb_url", "running.glb"),
        ):
            url = basic_animations.get(source_key)
            if url:
                destination = project_dir / filename
                client.download(url, destination)
                downloads.append(destination)
        return downloads

    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "rigging",
        task_type="rigging",
        stage="complete",
        download_callback=download_rig_outputs,
    )
    output_json(response)


def handle_animate(args: argparse.Namespace, cwd: Path) -> None:
    require_confirmation(args)
    client = MeshyClient(require_api_key(cwd))
    payload = {
        "rig_task_id": args.rig_task_id,
        "action_id": args.action_id,
    }
    endpoint = "/openapi/v1/animations"
    task_id = client.create_task(endpoint, payload)

    def download_animation(task: dict[str, Any], project_dir: Path) -> list[Path]:
        if not args.download_glb:
            return []
        result = task.get("result") or {}
        animation_url = result.get("animation_glb_url")
        if not animation_url:
            raise MeshyCliError("Meshy did not return an animation .glb URL.")
        destination = project_dir / "animated.glb"
        client.download(animation_url, destination)
        return [destination]

    response = maybe_wait_for_task(
        args=args,
        client=client,
        endpoint=endpoint,
        task_id=task_id,
        cwd=cwd,
        project_name=args.project_name or "animation",
        task_type="animation",
        stage="complete",
        download_callback=download_animation,
    )
    output_json(response)


def add_shared_generation_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--confirm-spend", action="store_true", help="Acknowledge that this command will spend Meshy credits.")
    parser.add_argument("--wait", action="store_true", help="Poll the Meshy task until it finishes.")
    parser.add_argument("--timeout-seconds", type=int, default=900, help="Polling timeout when --wait is enabled.")
    parser.add_argument("--project-name", help="Project name used for the output folder slug.")
    parser.add_argument("--project-dir", help="Existing meshy_output project directory to reuse for chained tasks.")
    parser.add_argument("--download-glb", action="store_true", help="Download the resulting .glb when Meshy returns one.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Project-local Meshy 3D helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    balance = subparsers.add_parser("balance", help="Fetch Meshy credit balance.")
    balance.set_defaults(handler=handle_balance)

    preview = subparsers.add_parser("text-to-3d-preview", help="Create a preview text-to-3d task.")
    add_shared_generation_flags(preview)
    preview.add_argument("--prompt", required=True)
    preview.add_argument("--ai-model", default="latest")
    preview.add_argument("--model-type")
    preview.add_argument("--topology", choices=("triangle", "quad"))
    preview.add_argument("--target-polycount", type=int)
    preview.add_argument("--should-remesh", action="store_true")
    preview.add_argument("--symmetry-mode", choices=("auto", "on", "off"))
    preview.add_argument("--pose-mode", choices=("a-pose", "t-pose"))
    preview.set_defaults(handler=handle_text_to_3d_preview)

    refine = subparsers.add_parser("text-to-3d-refine", help="Refine a preview text-to-3d task.")
    add_shared_generation_flags(refine)
    refine.add_argument("--preview-task-id", required=True)
    refine.add_argument("--ai-model", default="latest")
    refine.add_argument("--texture-prompt")
    refine.add_argument("--disable-pbr", action="store_true")
    refine.set_defaults(handler=handle_text_to_3d_refine)

    image = subparsers.add_parser("image-to-3d", help="Create a 3D model from one image.")
    add_shared_generation_flags(image)
    image.add_argument("--image", required=True, help="URL, data URI, or local image path.")
    image.add_argument("--ai-model", default="latest")
    image.add_argument("--no-texture", action="store_true")
    image.add_argument("--disable-pbr", action="store_true")
    image.set_defaults(handler=handle_image_to_3d)

    multi_image = subparsers.add_parser("multi-image-to-3d", help="Create a 3D model from multiple images.")
    add_shared_generation_flags(multi_image)
    multi_image.add_argument("--image", action="append", required=True, help="Repeat for each image input.")
    multi_image.add_argument("--ai-model", default="latest")
    multi_image.add_argument("--no-texture", action="store_true")
    multi_image.add_argument("--disable-pbr", action="store_true")
    multi_image.set_defaults(handler=handle_multi_image_to_3d)

    retexture = subparsers.add_parser("retexture", help="Apply a new texture style to a Meshy task or model URL.")
    add_shared_generation_flags(retexture)
    source_group = retexture.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--input-task-id")
    source_group.add_argument("--model-url")
    style_group = retexture.add_mutually_exclusive_group(required=True)
    style_group.add_argument("--text-style")
    style_group.add_argument("--image-style", help="URL, data URI, or local image path.")
    retexture.add_argument("--disable-pbr", action="store_true")
    retexture.set_defaults(handler=handle_retexture)

    remesh = subparsers.add_parser("remesh", help="Change formats or topology for a Meshy task.")
    add_shared_generation_flags(remesh)
    remesh.add_argument("--input-task-id", required=True)
    remesh.add_argument("--target-format", action="append", required=True, help="Repeat for each requested format.")
    remesh.add_argument("--topology", choices=("triangle", "quad"))
    remesh.add_argument("--target-polycount", type=int)
    remesh.set_defaults(handler=handle_remesh)

    rig = subparsers.add_parser("rig", help="Auto-rig a compatible Meshy character.")
    add_shared_generation_flags(rig)
    rig.add_argument("--input-task-id", required=True)
    rig.add_argument("--source-endpoint", default="/openapi/v2/text-to-3d")
    rig.add_argument("--height-meters", type=float, default=1.7)
    rig.set_defaults(handler=handle_rig)

    animate = subparsers.add_parser("animate", help="Apply a custom animation to a rigged Meshy character.")
    add_shared_generation_flags(animate)
    animate.add_argument("--rig-task-id", required=True)
    animate.add_argument("--action-id", type=int, required=True)
    animate.set_defaults(handler=handle_animate)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    cwd = Path.cwd()
    try:
        args.handler(args, cwd)
    except MeshyCliError as exc:
        stderr(f"ERROR: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
