"""Read proof transport while retaining the identity of original JSON bytes."""
import gzip
import hashlib
import json
from pathlib import Path


def read_proof_bytes(path):
    path = Path(path)
    if path.suffix == '.gz':
        return gzip.decompress(path.read_bytes())
    if path.exists():
        return path.read_bytes()
    compressed = Path(str(path) + '.gz')
    if compressed.exists():
        return gzip.decompress(compressed.read_bytes())
    raise FileNotFoundError(f'Missing proof: {path} (or {compressed})')


def read_proof_json(path):
    return json.loads(read_proof_bytes(path))


def proof_digest(path):
    return hashlib.sha256(read_proof_bytes(path)).hexdigest()
