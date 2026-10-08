"""Portable Blender entry point for catalog scripts; no shell interpolation."""
import os
from pathlib import Path
import shutil
import subprocess
import sys

MAC_BLENDER = Path('/Applications/Blender.app/Contents/MacOS/Blender')


def executable():
    override = os.environ.get('BLENDER_BIN')
    if override is not None:
        candidate = shutil.which(override)
        if not candidate:
            raise RuntimeError('BLENDER_BIN must name an executable path or command')
        return candidate
    if MAC_BLENDER.is_file() and os.access(MAC_BLENDER, os.X_OK):
        return str(MAC_BLENDER)
    candidate = shutil.which('blender')
    if not candidate:
        raise RuntimeError('Blender not found; set BLENDER_BIN to its executable')
    return candidate


def script_command(script, args=()):
    return [executable(), '--background', '--factory-startup',
            '--python-exit-code', '1', '--python', str(script), '--',
            *map(str, args)]


def main():
    args = sys.argv[1:]
    try:
        if args == ['--version']:
            command = [executable(), '--version']
        elif args and args[0] not in ('-h', '--help'):
            script = Path(args[0])
            if not script.is_file():
                raise RuntimeError(f'Blender script not found: {script}')
            command = script_command(script, args[1:])
        else:
            print('Usage: python3 tools/avatar/blender_cli.py SCRIPT [script arguments]\n'
                  '       python3 tools/avatar/blender_cli.py --version\n'
                  'BLENDER_BIN overrides the macOS default or blender on PATH.')
            return 0
        return subprocess.run(command).returncode
    except (RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
