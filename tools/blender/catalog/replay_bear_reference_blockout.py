"""Replay a source-bound bear snapshot into a new directory, from the repo root.

Run through tools/avatar/blender_cli.py with --revision=PATH --output-dir=PATH.
Validation uses only the standard library; the saved builder owns Blender work.
"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sys


def read_provenance(path):
    if not path.is_file():
        raise ValueError(f'Missing provenance: {path}')
    value = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(value, dict):
        raise ValueError(f'Expected provenance object: {path}')
    return value


def require_digest(path, expected):
    if not path.is_file():
        raise ValueError(f'Missing construction source: {path}')
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError(f'SHA-256 mismatch: {path}')


def replay(revision, output_dir):
    root = Path.cwd().resolve()
    revision = Path(revision).resolve()
    output_dir = Path(output_dir).resolve()
    builder = revision / 'builder.py'
    design = revision / 'design.json'
    report = read_provenance(revision / 'blockout-report.json')
    require_digest(builder, report.get('builder_sha256'))
    require_digest(design, report.get('design_sha256'))
    dependencies = read_provenance(revision / 'construction-dependencies.json')
    helpers = dependencies.get('helperSha256')
    if not isinstance(helpers, dict) or not helpers:
        raise ValueError('Missing helperSha256 construction provenance')
    for relative, expected in helpers.items():
        if not isinstance(relative, str) or Path(relative).is_absolute():
            raise ValueError(f'Helper path must be repo-relative: {relative}')
        helper = (root / relative).resolve()
        if not helper.is_relative_to(root):
            raise ValueError(f'Helper path must stay repo-relative: {relative}')
        require_digest(helper, expected)

    if output_dir.is_relative_to(revision) or revision.is_relative_to(output_dir):
        raise ValueError('Replay output cannot overlap the saved revision')
    if output_dir.exists() and (not output_dir.is_dir() or any(output_dir.iterdir())):
        raise ValueError('Replay output must be a new or empty directory')

    original_argv, original_path = sys.argv, sys.path[:]
    try:
        sys.path.insert(0, str(root / 'tools/blender/catalog'))
        sys.argv = [str(builder), '--', '--design', str(design), '--output-dir', str(output_dir)]
        runpy.run_path(str(builder), run_name='__main__')
    finally:
        sys.argv = original_argv
        sys.path[:] = original_path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    if argv is None:
        argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    replay(args.revision, args.output_dir)


if __name__ == '__main__':
    main()
