import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile


SCRIPT = Path(__file__).with_name("create-hostinger-archive.py")
SPEC = importlib.util.spec_from_file_location("create_hostinger_archive", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class HostingerArchiveTest(unittest.TestCase):
    def fixture(self, root: Path) -> None:
        (root / ".nvmrc").write_text("22\n")
        (root / "package.json").write_text('{"scripts":{"build":"next build"}}\n')
        (root / "package-lock.json").write_text('{"lockfileVersion":3}\n')
        (root / "tsconfig.base.json").write_text('{"compilerOptions":{}}\n')
        for directory in ("apps/web/src", "packages/ui/src", "config"):
            (root / directory).mkdir(parents=True, exist_ok=True)
        (root / "apps/web/src/page.tsx").write_text("export default function Page() {}\n")
        (root / "apps/web/src/page.test.tsx").write_text("must not ship\n")
        (root / "apps/web/.env.production").write_text("SECRET=must-not-ship\n")
        (root / "apps/web/tsconfig.tsbuildinfo").write_text("cache\n")
        (root / "packages/ui/src/index.ts").write_text("export {};\n")
        (root / "config/theme.json").write_text('{}\n')

    def test_creates_deterministic_allowlisted_archive(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            first = root / "first.zip"
            second = root / "second.zip"

            result_a = MODULE.create_archive(root, first)
            result_b = MODULE.create_archive(root, second)

            self.assertEqual(result_a["sha256"], result_b["sha256"])
            self.assertFalse(result_a["containsSecrets"])
            self.assertEqual(result_a["status"], "PREPARED_NOT_DEPLOYED")
            with zipfile.ZipFile(first) as archive:
                names = set(archive.namelist())
            self.assertIn("apps/web/src/page.tsx", names)
            self.assertIn("packages/ui/src/index.ts", names)
            self.assertIn("tsconfig.base.json", names)
            self.assertNotIn("apps/web/src/page.test.tsx", names)
            self.assertNotIn("apps/web/.env.production", names)
            self.assertNotIn("apps/web/tsconfig.tsbuildinfo", names)

    def test_rejects_private_key_material(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            (root / "config/bad.txt").write_text(
                "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n"
            )
            with self.assertRaisesRegex(RuntimeError, "private key material"):
                MODULE.create_archive(root, root / "bad.zip")

    def test_manifest_is_json_serializable(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            result = MODULE.create_archive(root, root / "bundle.zip")
            encoded = json.dumps(result)
            self.assertIn('"node_version": 22', encoded)
            self.assertIn('"root_directory": "."', encoded)


if __name__ == "__main__":
    unittest.main()
