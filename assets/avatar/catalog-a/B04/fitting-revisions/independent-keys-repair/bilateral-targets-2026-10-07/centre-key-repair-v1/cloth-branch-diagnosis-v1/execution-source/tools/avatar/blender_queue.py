"""Serialize local Blender work across worktrees without shell interpolation.

Usage: python3 tools/avatar/blender_queue.py -- COMMAND [ARG ...]
Wrap one Blender command or an entire sequential verification runner, never both.
"""
import argparse
import fcntl
import os
from pathlib import Path
import signal
import stat
import subprocess
import sys
import tempfile

ACTIVE_ENV = 'TEO_LEARN_BLENDER_QUEUE_ACTIVE'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lock-path', default=str(
        Path(tempfile.gettempdir()) / f'teo-learn-blender-{os.getuid()}.lock'),
        help='Isolated lock file for tests; normally use the per-user default')
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if not args.command or args.command[0] != '--' or len(args.command) == 1:
        parser.error('provide -- COMMAND [ARG ...]')
    if os.environ.get(ACTIVE_ENV):
        parser.error('nested Blender queue wrappers are not supported; wrap the outer runner only')

    child = None
    cancelled = None
    lock_fd = None

    def cancel(signum, _frame):
        nonlocal cancelled
        cancelled = signum
        if child is None:
            raise SystemExit(128 + signum)
        try:
            # Also stop descendants started by a sequential runner. Waiting for
            # the direct child retains the lock until cancellation completes.
            os.killpg(child.pid, signum)
        except ProcessLookupError:
            pass

    previous_handlers = {sig: signal.signal(sig, cancel)
                         for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)}
    try:
        lock_fd = os.open(args.lock_path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        info = os.fstat(lock_fd)
        if info.st_uid != os.getuid() or not stat.S_ISREG(info.st_mode):
            raise RuntimeError('Blender queue lock must be a regular file owned by the current user')
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        env = dict(os.environ, **{ACTIVE_ENV: '1'})
        # The inherited descriptor keeps this same flock alive if the wrapper
        # is killed while its direct child is still working. Do not explicitly
        # unlock it or delete the lock file during cleanup.
        child = subprocess.Popen(args.command[1:], env=env, pass_fds=(lock_fd,),
                                 start_new_session=True)
        code = child.wait()
        return 128 + cancelled if cancelled is not None else code if code >= 0 else 128 - code
    except (OSError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    finally:
        if lock_fd is not None:
            os.close(lock_fd)
        for sig, handler in previous_handlers.items():
            signal.signal(sig, handler)


if __name__ == '__main__':
    sys.exit(main())
