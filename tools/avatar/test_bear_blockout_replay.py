"""Snapshot replay contracts; no Blender process or bpy dependency."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).parents[1] / 'blender/catalog/replay_bear_reference_blockout.py'


class BearBlockoutReplayTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(MODULE.is_file(), 'Snapshot replay runner is missing')
        spec = importlib.util.spec_from_file_location('bear_replay', MODULE)
        self.tool = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.tool)
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.revision = self.root / 'snapshots/blockout-v9'
        self.revision.mkdir(parents=True)
        self.output = self.root / 'replayed/blockout-v9'
        self.helper = self.root / 'tools/blender/catalog/helper.py'
        self.helper.parent.mkdir(parents=True)
        self.helper.write_text('SAVED_HELPER = True\n')
        (self.revision / 'builder.py').write_text('raise AssertionError("Never run in tests")\n')
        (self.revision / 'design.json').write_text('{"saved": true}\n')
        self.write_json('blockout-report.json', {
            'builder_sha256': self.digest(self.revision / 'builder.py'),
            'design_sha256': self.digest(self.revision / 'design.json'),
        })
        self.write_json('construction-dependencies.json', {
            'helperSha256': {str(self.helper.relative_to(self.root)): self.digest(self.helper)},
        })

    def digest(self, path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def write_json(self, name, value):
        (self.revision / name).write_text(json.dumps(value))

    def replay(self):
        with patch.object(self.tool.Path, 'cwd', return_value=self.root):
            return self.tool.main([
                f'--revision={self.revision}', f'--output-dir={self.output}',
            ])

    def test_exact_saved_builder_receives_snapshot_design_and_new_output(self):
        before_argv, before_path = sys.argv[:], sys.path[:]
        observed = {}

        def execute(builder, run_name):
            observed.update(builder=builder, run_name=run_name, argv=sys.argv[:], path=sys.path[:])

        with patch.object(self.tool.runpy, 'run_path', side_effect=execute):
            self.replay()
        builder = str(self.revision / 'builder.py')
        self.assertEqual(observed['builder'], builder)
        self.assertEqual(observed['run_name'], '__main__')
        self.assertEqual(observed['argv'], [
            builder, '--', '--design', str(self.revision / 'design.json'),
            '--output-dir', str(self.output),
        ])
        self.assertEqual(observed['path'][0], str(self.helper.parent))
        self.assertEqual(sys.argv, before_argv)
        self.assertEqual(sys.path, before_path)
        self.assertFalse(self.output.exists(), 'Runner must leave output creation to the saved builder')

    def test_changed_builder_design_or_helper_rejected_before_execution(self):
        for path in [self.revision / 'builder.py', self.revision / 'design.json', self.helper]:
            with self.subTest(path=path):
                original = path.read_bytes()
                path.write_bytes(original + b'changed')
                with patch.object(self.tool.runpy, 'run_path') as execute:
                    with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                        self.replay()
                    execute.assert_not_called()
                path.write_bytes(original)

    def test_missing_sources_or_provenance_rejected_before_execution(self):
        for path in [self.revision / name for name in [
            'builder.py', 'design.json', 'blockout-report.json', 'construction-dependencies.json',
        ]] + [self.helper]:
            with self.subTest(path=path):
                original = path.read_bytes()
                path.unlink()
                with patch.object(self.tool.runpy, 'run_path') as execute:
                    with self.assertRaisesRegex(ValueError, 'Missing'):
                        self.replay()
                    execute.assert_not_called()
                path.write_bytes(original)

    def test_missing_hashes_or_empty_helper_provenance_rejected(self):
        for name, value in [('blockout-report.json', {}), ('construction-dependencies.json', {'helperSha256': {}})]:
            with self.subTest(name=name):
                original = (self.revision / name).read_bytes()
                self.write_json(name, value)
                with patch.object(self.tool.runpy, 'run_path') as execute:
                    with self.assertRaises(ValueError):
                        self.replay()
                    execute.assert_not_called()
                (self.revision / name).write_bytes(original)

    def test_helpers_must_be_repo_relative_and_cannot_escape_checkout(self):
        for path in [str(self.helper), '../outside.py']:
            with self.subTest(path=path):
                self.write_json('construction-dependencies.json', {'helperSha256': {path: 'irrelevant'}})
                with self.assertRaisesRegex(ValueError, 'repo-relative'):
                    self.replay()

    def test_replay_cannot_overwrite_snapshot_or_existing_output(self):
        existing = self.root / 'existing'
        existing.mkdir()
        (existing / 'bear-blockout.blend').write_bytes(b'old-model')
        for output in [self.revision, self.revision / 'new', self.root, existing]:
            with self.subTest(output=output), patch.object(self.tool.runpy, 'run_path') as execute:
                self.output = output
                with self.assertRaises(ValueError):
                    self.replay()
                execute.assert_not_called()

    def test_blender_cli_separator_is_supported_and_execution_errors_restore_process_state(self):
        arguments = ['blender', '--background', '--python', str(MODULE), '--',
                     f'--revision={self.revision}', f'--output-dir={self.output}']
        with patch.object(sys, 'argv', arguments), patch.object(self.tool.Path, 'cwd', return_value=self.root):
            before_path = sys.path[:]
            with patch.object(self.tool.runpy, 'run_path', side_effect=RuntimeError('saved builder failed')):
                with self.assertRaisesRegex(RuntimeError, 'saved builder failed'):
                    self.tool.main()
            self.assertEqual(sys.argv, arguments)
            self.assertEqual(sys.path, before_path)


if __name__ == '__main__':
    unittest.main()
