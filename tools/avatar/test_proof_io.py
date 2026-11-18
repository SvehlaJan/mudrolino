"""Portable proof transport preserves decompressed JSON byte identity."""
import gzip
import hashlib
import tempfile
import unittest
from pathlib import Path
from proof_io import read_proof_bytes, read_proof_json, proof_digest


class ProofTransportTest(unittest.TestCase):
    def test_reads_compressed_fallback_and_hashes_original_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'report.json'
            original = b'{"status": "passed"}\n'
            path.with_suffix('.json.gz').write_bytes(gzip.compress(original))
            self.assertEqual(read_proof_bytes(path), original)
            self.assertEqual(read_proof_json(path), {'status': 'passed'})
            self.assertEqual(proof_digest(path), hashlib.sha256(original).hexdigest())
            self.assertEqual(read_proof_bytes(path.with_suffix('.json.gz')), original)

    def test_does_not_mask_a_corrupt_existing_json_with_compressed_copy(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'report.json'
            path.write_text('broken')
            path.with_suffix('.json.gz').write_bytes(gzip.compress(b'{}'))
            with self.assertRaises(ValueError):
                read_proof_json(path)

    def test_missing_proof_names_both_supported_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'missing.json'
            with self.assertRaisesRegex(FileNotFoundError, 'missing.json'):
                read_proof_bytes(path)


if __name__ == '__main__':
    unittest.main()
