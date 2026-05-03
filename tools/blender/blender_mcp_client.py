"""Small stdio client for the Blender MCP server.

Codex does not always expose ad-hoc local MCP servers as native tools during an
active session. This helper lets repo automation call the already configured
`uvx blender-mcp` server directly.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Any


def read_message(stdout) -> dict[str, Any]:
    line = stdout.readline()
    if not line:
        raise RuntimeError("MCP server closed stdout")
    return json.loads(line.decode("utf-8"))


def write_message(stdin, message: Mapping[str, Any]) -> None:
    payload = json.dumps(message, separators=(",", ":")).encode("utf-8") + b"\n"
    stdin.write(payload)
    stdin.flush()


class McpClient:
    def __init__(self) -> None:
        self.next_id = 1
        self.proc = subprocess.Popen(
            ["uvx", "blender-mcp"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if self.proc.stdin is None or self.proc.stdout is None:
            raise RuntimeError("Failed to open MCP stdio pipes")

    def request(self, method: str, params: Mapping[str, Any] | None = None) -> dict[str, Any]:
        request_id = self.next_id
        self.next_id += 1
        message: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
        }
        if params is not None:
            message["params"] = params

        write_message(self.proc.stdin, message)
        while True:
            response = read_message(self.proc.stdout)
            if response.get("id") == request_id:
                if "error" in response:
                    raise RuntimeError(json.dumps(response["error"], indent=2))
                return response["result"]

    def notify(self, method: str, params: Mapping[str, Any] | None = None) -> None:
        message: dict[str, Any] = {
            "jsonrpc": "2.0",
            "method": method,
        }
        if params is not None:
            message["params"] = params
        write_message(self.proc.stdin, message)

    def initialize(self) -> dict[str, Any]:
        result = self.request(
            "initialize",
            {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "teo-learn-blender-mcp-client", "version": "0.1.0"},
            },
        )
        self.notify("notifications/initialized")
        return result

    def close(self) -> None:
        if self.proc.stdin is not None:
            self.proc.stdin.close()
        self.proc.terminate()
        try:
            self.proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait(timeout=3)


def main() -> None:
    parser = argparse.ArgumentParser(description="Call the local Blender MCP server")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("list-tools")

    call = subparsers.add_parser("call-tool")
    call.add_argument("name")
    call.add_argument("--arguments", default="{}", help="JSON object passed as tool arguments")
    call.add_argument("--arguments-file", help="Path to a JSON object passed as tool arguments")

    args = parser.parse_args()
    client = McpClient()
    try:
        client.initialize()
        if args.command == "list-tools":
            print(json.dumps(client.request("tools/list"), indent=2))
        elif args.command == "call-tool":
            arguments = (
                json.loads(Path(args.arguments_file).read_text())
                if args.arguments_file
                else json.loads(args.arguments)
            )
            print(
                json.dumps(
                    client.request(
                        "tools/call",
                        {"name": args.name, "arguments": arguments},
                    ),
                    indent=2,
                )
            )
    finally:
        client.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
