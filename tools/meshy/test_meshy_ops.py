import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from meshy_ops import create_project_dir, load_api_key, record_task


class LoadApiKeyTests(unittest.TestCase):
    def test_prefers_environment_variable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cwd = Path(temp_dir)
            (cwd / ".env").write_text("MESHY_API_KEY=msy_from_env_file\n", encoding="utf-8")
            original = os.environ.get("MESHY_API_KEY")
            os.environ["MESHY_API_KEY"] = "msy_from_environment"
            try:
                self.assertEqual(load_api_key(cwd), "msy_from_environment")
            finally:
                if original is None:
                    os.environ.pop("MESHY_API_KEY", None)
                else:
                    os.environ["MESHY_API_KEY"] = original

    def test_reads_repo_local_dotenv(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cwd = Path(temp_dir)
            (cwd / ".env").write_text("MESHY_API_KEY=msy_from_env_file\n", encoding="utf-8")
            original = os.environ.pop("MESHY_API_KEY", None)
            try:
                self.assertEqual(load_api_key(cwd), "msy_from_env_file")
            finally:
                if original is not None:
                    os.environ["MESHY_API_KEY"] = original


class ProjectOutputTests(unittest.TestCase):
    def test_project_dir_is_created_under_meshy_output(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cwd = Path(temp_dir)
            project_dir = create_project_dir(cwd=cwd, task_id="12345678abcdef", project_name="Blue Robot")

            self.assertTrue(project_dir.is_dir())
            self.assertEqual(project_dir.parent.name, "meshy_output")
            self.assertIn("blue-robot", project_dir.name)
            self.assertIn("12345678", project_dir.name)

    def test_record_task_updates_project_metadata_and_history(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cwd = Path(temp_dir)
            project_dir = create_project_dir(cwd=cwd, task_id="12345678abcdef", project_name="Blue Robot")

            record_task(
                cwd=cwd,
                project_dir=project_dir,
                task_id="12345678abcdef",
                task_type="text-to-3d",
                stage="preview",
                project_name="Blue Robot",
                files=["preview.glb"],
            )

            metadata = json.loads((project_dir / "metadata.json").read_text(encoding="utf-8"))
            history = json.loads((cwd / "meshy_output" / "history.json").read_text(encoding="utf-8"))

            self.assertEqual(metadata["project_name"], "Blue Robot")
            self.assertEqual(metadata["tasks"][0]["files"], ["preview.glb"])
            self.assertEqual(history["projects"][0]["task_count"], 1)


if __name__ == "__main__":
    unittest.main()
