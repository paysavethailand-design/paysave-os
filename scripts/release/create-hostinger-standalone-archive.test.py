import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile


SCRIPT = Path(__file__).with_name("create-hostinger-standalone-archive.py")
SPEC = importlib.util.spec_from_file_location("create_hostinger_standalone_archive", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class HostingerStandaloneArchiveTest(unittest.TestCase):
    def fixture(self, root: Path) -> None:
        app = root / "apps/web/.next/standalone/apps/web"
        app.mkdir(parents=True)
        (app / "server.js").write_text("console.log('server')\n")
        (app / "package.json").write_text('{"name":"source-app"}\n')
        dependency = root / "apps/web/.next/standalone/node_modules/example"
        dependency.mkdir(parents=True)
        (dependency / "index.js").write_text("module.exports = true\n")
        static = root / "apps/web/.next/static/chunks"
        static.mkdir(parents=True)
        (static / "app.js").write_text("static\n")
        public = root / "apps/web/public"
        public.mkdir(parents=True)
        (public / "favicon.ico").write_bytes(b"icon")
        deploy = root / "deploy/hostinger"
        deploy.mkdir(parents=True)
        (deploy / "runtime-package.json").write_text(
            json.dumps({
                "name": "paysave-hostinger-runtime",
                "version": "0.1.0",
                "private": True,
                "scripts": {"build": "node -e \"\"", "start": "node server.js"},
                "dependencies": {"next": "15.5.21"},
            }) + "\n"
        )
        (deploy / "runtime-package-lock.json").write_text(
            json.dumps({
                "name": "paysave-hostinger-runtime",
                "version": "0.1.0",
                "lockfileVersion": 3,
                "requires": True,
                "packages": {"": {"name": "paysave-hostinger-runtime", "version": "0.1.0", "dependencies": {"next": "15.5.21"}}},
            }) + "\n"
        )

    def test_packages_runtime_assets_and_minimal_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            output = root / "runtime.zip"
            result = MODULE.create_archive(root, output, False)
            self.assertEqual(result["status"], "LOCALLY_BUILT_NOT_DEPLOYED")
            self.assertFalse(result["environmentBound"])
            self.assertEqual(result["deploymentOptions"]["entry_file"], "server.js")
            with zipfile.ZipFile(output) as archive:
                names = set(archive.namelist())
                package = json.loads(archive.read("apps/web/package.json"))
            self.assertIn("apps/web/server.js", names)
            self.assertIn("apps/web/.next/static/chunks/app.js", names)
            self.assertIn("apps/web/public/favicon.ico", names)
            self.assertNotIn("node_modules/example/index.js", names)
            self.assertEqual(package["scripts"]["start"], "node server.js")
            self.assertEqual(package["dependencies"]["next"], "15.5.21")

    def test_is_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            first = MODULE.create_archive(root, root / "one.zip", False)
            second = MODULE.create_archive(root, root / "two.zip", False)
            self.assertEqual(first["sha256"], second["sha256"])

    def test_rejects_secret_filename(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            secret = root / "apps/web/.next/standalone/apps/web/.env.production"
            secret.write_text("SECRET=not-real\n")
            with self.assertRaisesRegex(RuntimeError, "prohibited secret filename"):
                MODULE.create_archive(root, root / "bad.zip", False)


if __name__ == "__main__":
    unittest.main()
