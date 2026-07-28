#!/usr/bin/env python3
"""Package a built Next.js standalone runtime for Hostinger Web Apps."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import sys
import tempfile
import zipfile

MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
FIXED_ZIP_TIME = (2026, 7, 28, 0, 0, 0)
PEM_MARKERS = (b"-----BEGIN PRIVATE KEY-----", b"-----BEGIN RSA PRIVATE KEY-----")

def copy_runtime(root: Path, staging: Path) -> Path:
    standalone = root / "apps/web/.next/standalone"
    app_root = standalone / "apps/web"
    server = app_root / "server.js"
    static = root / "apps/web/.next/static"
    public = root / "apps/web/public"
    runtime_package = root / "deploy/hostinger/runtime-package.json"
    runtime_lock = root / "deploy/hostinger/runtime-package-lock.json"
    if not server.is_file():
        raise RuntimeError("standalone server is missing; run the production build first")
    if not static.is_dir():
        raise RuntimeError("Next.js static assets are missing")
    if not runtime_package.is_file() or not runtime_lock.is_file():
        raise RuntimeError("Hostinger runtime package template or lockfile is missing")

    shutil.copytree(
        standalone,
        staging,
        symlinks=False,
        ignore=shutil.ignore_patterns("node_modules"),
    )
    for root_manifest in (staging / "package.json", staging / "package-lock.json"):
        root_manifest.unlink(missing_ok=True)
    runtime_app = staging / "apps/web"
    shutil.copytree(static, runtime_app / ".next/static", dirs_exist_ok=True)
    if public.is_dir():
        shutil.copytree(public, runtime_app / "public", dirs_exist_ok=True)
    shutil.copy2(runtime_package, runtime_app / "package.json")
    shutil.copy2(runtime_lock, runtime_app / "package-lock.json")
    return runtime_app


def collect_files(staging: Path) -> list[tuple[Path, PurePosixPath]]:
    files: list[tuple[Path, PurePosixPath]] = []
    for path in staging.rglob("*"):
        relative = PurePosixPath(path.relative_to(staging).as_posix())
        if path.is_symlink():
            raise RuntimeError(f"symbolic link remained in runtime payload: {relative}")
        if not path.is_file():
            continue
        name = relative.name.lower()
        if name.startswith(".env") or name.endswith((".pem", ".key", ".p12", ".pfx")):
            raise RuntimeError(f"prohibited secret filename in runtime payload: {relative}")
        files.append((path, relative))
    files.sort(key=lambda row: row[1].as_posix())
    return files


def create_archive(root: Path, output: Path, environment_bound: bool) -> dict[str, object]:
    root = root.resolve()
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="paysave-hostinger-runtime-") as temporary:
        staging = Path(temporary) / "runtime"
        copy_runtime(root, staging)
        files = collect_files(staging)
        source_bytes = 0
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path, relative in files:
                data = path.read_bytes()
                if any(marker in data for marker in PEM_MARKERS):
                    raise RuntimeError(f"private key material detected: {relative}")
                source_bytes += len(data)
                info = zipfile.ZipInfo(relative.as_posix(), FIXED_ZIP_TIME)
                executable = bool(path.stat().st_mode & stat.S_IXUSR)
                info.external_attr = (0o755 if executable else 0o644) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, data, compresslevel=9)

    archive_bytes = output.stat().st_size
    if archive_bytes > MAX_ARCHIVE_BYTES:
        output.unlink(missing_ok=True)
        raise RuntimeError(f"runtime archive exceeds Hostinger's 50 MB limit: {archive_bytes} bytes")
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    return {
        "schemaVersion": 1,
        "provider": "hostinger-web-apps",
        "artifactType": "next-standalone-runtime",
        "archive": output.name,
        "sha256": digest,
        "fileCount": len(files),
        "sourceBytes": source_bytes,
        "archiveBytes": archive_bytes,
        "maxArchiveBytes": MAX_ARCHIVE_BYTES,
        "containsSecrets": False,
        "environmentBound": environment_bound,
        "deploymentOptions": {
            "node_version": 22,
            "package_manager": "npm",
            "root_directory": "apps/web",
            "build_script": "build",
            "app_type": None,
            "entry_file": "server.js",
        },
        "status": "READY_FOR_AUTHORIZED_DEPLOYMENT" if environment_bound else "LOCALLY_BUILT_NOT_DEPLOYED",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--environment-bound", action="store_true")
    args = parser.parse_args()
    result = create_archive(args.root, args.output, args.environment_bound)
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
