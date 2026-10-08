"""Behavioral contracts for isolated, review-only proportion exports."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).parents[1] / 'blender/catalog/preview_catalog_proportions.py'


class ProportionContracts(unittest.TestCase):
    def setUp(self):
        self.assertTrue(MODULE.is_file(), 'Proportion preview tool is not implemented')
        spec = importlib.util.spec_from_file_location('proportions', MODULE)
        self.tool = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.tool)

    def test_scale_changes_distance_about_pivot_without_moving_pivot(self):
        self.assertEqual(self.tool.scaled_point((1, 2, 3), (1, 2, 3), 1.3), (1, 2, 3))
        self.assertEqual(self.tool.scaled_point((1, 2, 4), (1, 2, 3), 1.2), (1, 2, 4.2))

    def test_baseline_preserves_coordinates_exactly(self):
        point = (.15193817, -.31910483, 1.61471918)
        self.assertEqual(self.tool.scaled_point(point, (0, 0, 1.5), 1), point)

    def test_review_envelope_uses_vertex_coordinates_not_face_indices(self):
        geometry = [([(-.2, -.1, 0), (.2, .1, 1.8)], [(8423, 8426, 8427)])]
        self.assertEqual(self.tool.review_envelope(geometry, [(0, 0, 1.9)]),
                         {'min': [-.2, -.1, 0], 'max': [.2, .1, 1.9]})

    def test_scales_reject_invalid_values_and_require_baseline(self):
        for values in [(0, 1), (1, float('nan')), (1, float('inf')), (1, 1), (1.1, 1.2), (1, 3)]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                self.tool.validate_scales(values)
        self.assertEqual(self.tool.validate_scales((1, 1.1, 1.2, 1.3)), (1, 1.1, 1.2, 1.3))

    def test_scales_cannot_collide_in_one_decimal_export_directories(self):
        with self.assertRaises(ValueError):
            self.tool.validate_scales((1, 1.04, 1.05))

    def test_output_cannot_overlap_protected_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            assets = root / 'assets'; assets.mkdir()
            for destination in [assets, assets / 'preview', root]:
                with self.assertRaises(ValueError):
                    self.tool.validate_output(destination, assets)
            self.tool.validate_output(root / 'artifacts' / 'review', assets)

    def test_symlink_output_cannot_escape_into_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); assets = root / 'assets'; assets.mkdir()
            (root / 'alias').symlink_to(assets, target_is_directory=True)
            with self.assertRaises(ValueError):
                self.tool.validate_output(root / 'alias' / 'preview', assets)


if __name__ == '__main__':
    unittest.main()
