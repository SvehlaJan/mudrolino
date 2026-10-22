import argparse
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from meshy_ops import (
    apply_mesh_shaping_flags,
    apply_sizing_format_flags,
    apply_texture_quality_flags,
    build_parser,
    create_project_dir,
    load_api_key,
    maybe_wait_for_task,
    record_task,
    MeshyClient,
    MeshyCliError,
)


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

    def test_task_updates_preserve_creation_provenance_and_other_chained_tasks(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cwd = Path(temp_dir)
            project = create_project_dir(cwd, "original-task", "Bear")
            common = dict(cwd=cwd, project_dir=project, task_type="image-to-3d", stage="complete", project_name="Bear")
            record_task(**common, task_id="original-task", files=["source.glb"])
            record_task(**common, task_id="paid-task", files=[], extra={"status": "SUBMITTED", "source_task": "original-task"})
            before = json.loads((project / "metadata.json").read_text())
            record_task(**common, task_id="paid-task", files=["model.glb"], extra={"status": "SUCCEEDED"})
            after = json.loads((project / "metadata.json").read_text())
            self.assertEqual(after["root_task_id"], "original-task")
            self.assertEqual(after["created_at"], before["created_at"])
            self.assertEqual(len(after["tasks"]), 2)
            self.assertEqual(after["tasks"][0], before["tasks"][0])
            self.assertEqual(after["tasks"][1]["created_at"], before["tasks"][1]["created_at"])
            self.assertEqual(after["tasks"][1]["extra"], {"status": "SUCCEEDED", "source_task": "original-task"})
            self.assertEqual(after["tasks"][1]["files"], ["model.glb"])
            history = json.loads((cwd / "meshy_output" / "history.json").read_text())
            self.assertEqual(history["projects"][0]["task_count"], 2)


class PayloadFlagTests(unittest.TestCase):
    def test_sizing_format_flags_added_only_when_set(self) -> None:
        args = argparse.Namespace(target_formats=["glb"], auto_size=True, origin_at="center")
        payload: dict = {}
        apply_sizing_format_flags(payload, args)
        self.assertEqual(payload, {"target_formats": ["glb"], "auto_size": True, "origin_at": "center"})

    def test_sizing_format_flags_omitted_when_unset(self) -> None:
        args = argparse.Namespace(target_formats=None, auto_size=False, origin_at=None)
        payload: dict = {}
        apply_sizing_format_flags(payload, args)
        self.assertEqual(payload, {})

    def test_mesh_shaping_flags(self) -> None:
        args = argparse.Namespace(model_type="lowpoly", decimation_mode=2)
        payload: dict = {}
        apply_mesh_shaping_flags(payload, args)
        self.assertEqual(payload, {"model_type": "lowpoly", "decimation_mode": 2})

    def test_texture_quality_flags(self) -> None:
        args = argparse.Namespace(hd_texture=True, keep_lighting=True)
        payload: dict = {}
        apply_texture_quality_flags(payload, args)
        self.assertEqual(payload, {"hd_texture": True, "remove_lighting": False})

    def test_helpers_tolerate_missing_attrs(self) -> None:
        args = argparse.Namespace()
        payload: dict = {}
        apply_sizing_format_flags(payload, args)
        apply_mesh_shaping_flags(payload, args)
        apply_texture_quality_flags(payload, args)
        self.assertEqual(payload, {})


class ImageGenerationTests(unittest.TestCase):
    def run_generation(self, command: str, *flags: str) -> tuple[str, dict]:
        class FakeClient:
            def create_task(self, endpoint: str, payload: dict) -> str:
                self.request = (endpoint, payload)
                return "test-task"

        client = FakeClient()
        args = build_parser().parse_args([
            command, "--image", "https://example.com/reference.png", "--confirm-spend", *flags,
        ])
        with patch("meshy_ops.require_api_key", return_value="test-key"), patch(
            "meshy_ops.MeshyClient", return_value=client,
        ), patch("meshy_ops.output_json"):
            args.handler(args, Path.cwd())
        return client.request

    def test_image_enhancement_is_tristate_in_both_payloads(self) -> None:
        for command in ("image-to-3d", "multi-image-to-3d"):
            for flags, expected in (((), None), (("--image-enhancement",), True), (("--no-image-enhancement",), False)):
                with self.subTest(command=command, flags=flags):
                    endpoint, payload = self.run_generation(command, *flags)
                    self.assertEqual(endpoint, f"/openapi/v1/{command}")
                    image_key = "image_url" if command == "image-to-3d" else "image_urls"
                    image_value = "https://example.com/reference.png"
                    expected_payload = {
                        image_key: image_value if command == "image-to-3d" else [image_value],
                        "should_texture": True,
                        "enable_pbr": True,
                        "ai_model": "latest",
                    }
                    if expected is not None:
                        expected_payload["image_enhancement"] = expected
                    self.assertEqual(payload, expected_payload)

    def test_image_pose_and_texture_resolution_use_current_api_fields(self) -> None:
        for pose in ("a-pose", "t-pose"):
            for resolution in ("2k", "4k", "8k"):
                with self.subTest(pose=pose, resolution=resolution):
                    _, payload = self.run_generation(
                        "image-to-3d", "--ai-model", "meshy-7.1", "--model-type", "standard",
                        "--no-image-enhancement", "--pose-mode", pose,
                        "--texture-resolution", resolution, "--target-formats", "glb",
                    )
                    self.assertEqual(payload, {
                        "image_url": "https://example.com/reference.png",
                        "should_texture": True,
                        "enable_pbr": True,
                        "ai_model": "meshy-7.1",
                        "model_type": "standard",
                        "image_enhancement": False,
                        "pose_mode": pose,
                        "texture_resolution": resolution,
                        "target_formats": ["glb"],
                    })

    def test_conflicting_enhancement_flags_are_rejected(self) -> None:
        for command in ("image-to-3d", "multi-image-to-3d"):
            with self.subTest(command=command), patch("sys.stderr"), self.assertRaises(SystemExit):
                build_parser().parse_args([
                    command, "--image", "reference.png", "--image-enhancement", "--no-image-enhancement",
                ])

    def test_new_image_options_reject_invalid_choices(self) -> None:
        for flag, value in (("--pose-mode", "sitting"), ("--texture-resolution", "16k")):
            with self.subTest(flag=flag), patch("sys.stderr"), self.assertRaises(SystemExit):
                build_parser().parse_args(["image-to-3d", "--image", "reference.png", flag, value])

    def test_all_paid_commands_require_confirmation_before_credentials_or_client(self) -> None:
        commands = (
            ["text-to-3d-preview", "--prompt", "bear"],
            ["text-to-3d-refine", "--preview-task-id", "test-task"],
            ["image-to-3d", "--image", "reference.png", "--no-image-enhancement", "--pose-mode", "a-pose", "--texture-resolution", "2k"],
            ["multi-image-to-3d", "--image", "reference.png", "--no-image-enhancement"],
            ["retexture", "--input-task-id", "test-task", "--text-style", "bear"],
            ["remesh", "--input-task-id", "test-task", "--target-format", "glb"],
            ["rig", "--input-task-id", "test-task"],
            ["animate", "--rig-task-id", "test-task", "--action-id", "1"],
        )
        for command in commands:
            with self.subTest(command=command[0]):
                args = build_parser().parse_args(command)
                with patch("meshy_ops.require_api_key") as key, patch("meshy_ops.MeshyClient") as client:
                    with self.assertRaisesRegex(MeshyCliError, "--confirm-spend"):
                        args.handler(args, Path.cwd())
                    key.assert_not_called()
                    client.assert_not_called()


class PaymentErrorTests(unittest.TestCase):
    def test_402_preserves_provider_message_code_and_balance_without_payload_or_key(self) -> None:
        class FakeClient(MeshyClient):
            def get_balance(self) -> dict:
                return {"balance": 1100}

        client = FakeClient("test-secret-key")
        with self.assertRaises(MeshyCliError) as caught:
            client.raise_for_http_error(402, {
                "message": "API billing must be enabled for test-secret-key",
                "code": "BILLING_REQUIRED",
                "request": {"image_url": "data:image/png;base64,private-image"},
                "headers": {"Authorization": "Bearer test-secret-key"},
            })
        message = str(caught.exception)
        self.assertIn("API billing must be enabled for [REDACTED]", message)
        self.assertIn("BILLING_REQUIRED", message)
        self.assertIn("Current balance: 1100", message)
        self.assertNotIn("test-secret-key", message)
        self.assertNotIn("private-image", message)
        self.assertNotIn("Authorization", message)

    def test_402_preserves_nested_error_detail_when_balance_fails(self) -> None:
        class FakeClient(MeshyClient):
            def get_balance(self) -> dict:
                raise MeshyCliError("Balance endpoint unavailable")

        client = FakeClient("test-secret-key")
        with self.assertRaises(MeshyCliError) as caught:
            client.raise_for_http_error(402, {
                "error": {"detail": "Account requires API credits", "code": "API_CREDITS_REQUIRED"},
            })
        message = str(caught.exception)
        self.assertIn("Account requires API credits", message)
        self.assertIn("API_CREDITS_REQUIRED", message)
        self.assertNotIn("Current balance", message)

    def test_402_without_scalar_details_does_not_dump_provider_payload(self) -> None:
        class FakeClient(MeshyClient):
            def get_balance(self) -> dict:
                return {}

        client = FakeClient("test-secret-key")
        with self.assertRaises(MeshyCliError) as caught:
            client.raise_for_http_error(402, {
                "detail": {"request": {"image_url": "private-image"}},
                "request": {"Authorization": "Bearer test-secret-key"},
            })
        self.assertIn("402", str(caught.exception))
        self.assertNotIn("private-image", str(caught.exception))
        self.assertNotIn("test-secret-key", str(caught.exception))


class WaitingTaskProvenanceTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.cwd = Path(temporary.name).resolve()
        self.project = self.cwd / "meshy_output" / "recoverable-bear"
        self.args = argparse.Namespace(
            command="image-to-3d", wait=True, timeout_seconds=900, project_dir=str(self.project),
        )
        self.endpoint = "/openapi/v1/image-to-3d"

    def metadata(self) -> dict:
        return json.loads((self.project / "metadata.json").read_text())

    def history(self) -> dict:
        return json.loads((self.cwd / "meshy_output" / "history.json").read_text())

    def wait(self, on_poll, download_callback=lambda task, project: []):
        class FakeClient:
            def poll_task(client, endpoint, task_id, timeout):
                self.assertEqual((endpoint, task_id, timeout), (self.endpoint, "paid-task", 900))
                return on_poll()

            def get_balance(client):
                return {"balance": 1070}

            def create_task(client, *args):
                raise AssertionError("A submitted task must never be resubmitted")

        with patch("meshy_ops.stderr"):
            return maybe_wait_for_task(
                args=self.args, client=FakeClient(), endpoint=self.endpoint, task_id="paid-task",
                cwd=self.cwd, project_name="Bear", task_type="image-to-3d", stage="complete",
                download_callback=download_callback,
            )

    def test_submission_is_persisted_before_poll_and_success_updates_same_task(self) -> None:
        observed = {}

        def poll():
            metadata = self.metadata()
            self.assertEqual(metadata["root_task_id"], "paid-task")
            self.assertEqual(len(metadata["tasks"]), 1)
            entry = metadata["tasks"][0]
            self.assertEqual(entry["task_id"], "paid-task")
            self.assertEqual(entry["extra"], {"endpoint": self.endpoint, "status": "SUBMITTED"})
            self.assertEqual(self.history()["projects"][0]["task_count"], 1)
            observed["created_at"] = entry["created_at"]
            return {"status": "SUCCEEDED", "model_urls": {"glb": "https://example.com/model.glb"}}

        def download(task, project):
            self.assertEqual(project, self.project)
            self.assertEqual(self.metadata()["tasks"][0]["extra"]["status"], "SUCCEEDED")
            destination = project / "model.glb"
            destination.write_bytes(b"fake-model")
            return [destination]

        response = self.wait(poll, download)
        tasks = self.metadata()["tasks"]
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["created_at"], observed["created_at"])
        self.assertEqual(tasks[0]["files"], ["model.glb"])
        self.assertEqual(tasks[0]["extra"]["status"], "SUCCEEDED")
        self.assertEqual(self.history()["projects"][0]["task_count"], 1)
        self.assertEqual(response["project_dir"], str(self.project))
        self.assertEqual(response["downloads"], [str(self.project / "model.glb")])

    def test_poll_failure_leaves_task_endpoint_and_project_for_resume(self) -> None:
        def timeout():
            raise MeshyCliError("Timed out waiting for task paid-task")

        with self.assertRaisesRegex(MeshyCliError, "Timed out"):
            self.wait(timeout)
        metadata = self.metadata()
        self.assertEqual(metadata["folder"], self.project.name)
        self.assertEqual(metadata["tasks"][0]["task_id"], "paid-task")
        self.assertEqual(metadata["tasks"][0]["extra"], {"endpoint": self.endpoint, "status": "SUBMITTED"})
        self.assertEqual(self.history()["projects"][0]["task_count"], 1)

    def test_download_failure_retains_remote_success_for_resume(self) -> None:
        def download(task, project):
            raise MeshyCliError("Download interrupted")

        with self.assertRaisesRegex(MeshyCliError, "Download interrupted"):
            self.wait(lambda: {"status": "SUCCEEDED"}, download)
        tasks = self.metadata()["tasks"]
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["task_id"], "paid-task")
        self.assertEqual(tasks[0]["extra"]["endpoint"], self.endpoint)
        self.assertEqual(tasks[0]["extra"]["status"], "SUCCEEDED")
        self.assertEqual(tasks[0]["files"], [])

    def test_non_waiting_response_remains_unchanged_without_filesystem_side_effects(self) -> None:
        self.args.wait = False
        response = self.wait(lambda: self.fail("Non-waiting calls must not poll"))
        self.assertEqual(response, {
            "command": "image-to-3d", "endpoint": self.endpoint, "task_id": "paid-task",
            "project_dir": None, "downloads": [],
        })
        self.assertFalse((self.cwd / "meshy_output").exists())


if __name__ == "__main__":
    unittest.main()
