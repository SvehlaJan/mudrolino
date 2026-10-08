"""Fingerprint transitive sibling Python helpers without importing native modules."""
import ast
import hashlib
import json
import sys
from pathlib import Path


def snapshot_files(paths):
    result = {}
    for path in paths:
        path = Path(path)
        assert path.is_file(), ('Missing tool', str(path))
        result[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    return dict(sorted(result.items()))


def assert_snapshot(snapshot):
    for path, expected in snapshot.items():
        path = Path(path)
        assert path.is_file(), ('Missing tool', str(path))
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, ('Tool drift', str(path))


def local_dependencies(root, seeds):
    """Follow static imports only when the sibling .py exists in this directory."""
    root = Path(root)
    assert root.is_dir(), 'Missing local tool directory'
    pending, seen = [], set()
    for seed in seeds:
        assert Path(seed).name == seed and Path(seed).suffix == '.py', 'Local tool path required'
        path = root / seed
        assert path.is_file(), ('Missing tool', str(path))
        pending.append(path)
    while pending:
        path = pending.pop()
        assert path.resolve().parent == root.resolve(), 'Local tool path required'
        if path in seen:
            continue
        seen.add(path)
        tree = ast.parse(path.read_text(), filename=str(path))
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name.split('.')[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module.split('.')[0])
        for name in imports:
            sibling = root / (name + '.py')
            if sibling.is_file():
                pending.append(sibling)
    return snapshot_files(sorted(seen))


if __name__ == '__main__':
    args = json.load(sys.stdin)
    if 'snapshot' in args:
        assert_snapshot(args['snapshot'])
    print(json.dumps(local_dependencies(args['root'], args['seeds'])))
