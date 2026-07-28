#!/usr/bin/env python3
"""Create a deterministic, secret-safe Hostinger Web Apps source archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
FIXED_ZIP_TIME = (2026, 7, 28, 0, 0, 0)
ROOT_FILES = (".nvmrc", "package.json", "package-lock.json", "tsconfig.base.json")
SOURCE_ROOTS = ("apps", "packages", "config")
EXCLUDED_PARTS = frozenset(
    {
        ".git",
        ".next",
        ".cache",
        ".npm-cache",
        ".playwright",
        ".turbo",
        ".vite",
        "__pycache__",
        "artifacts",
        "build",
        "coverage",
        "dist",
        "node_modules",
        "out",
        "test-results",
    }
)
EXCLUDED_SUFFIXES = (
    ".env",
    ".key",
    ".log",
    ".p12",
    ".pem",
    ".pfx",
    ".pid",
    ".tsbuildinfo",
)
EXCLUDED_TEST_MARKERS = (".test.", ".spec.")
PEM_MARKERS = (b"-----BEGIN PRIVATE KEY-----", b"-----BEGIN RSA PRIVATE KEY-----")


def excluded(relative: PurePosixPath) -> bool:
    parts = relative.parts
    name = relative.name.lower()
    if any(part in EXCLUDED_PARTS for part in parts):
        return True
    if any(part in {"__tests__", "e2e"} for part in parts):
        return True
    if name.startswith(".env") or name.endswith(EXCLUDED_SUFFIXES):
        return True
    return any(marker in name for marker in EXCLUDED_TEST_MARKERS)


def collect_files(root: Path) -> list[tuple[Path, PurePosixPath]]:
    collected: list[tuple[Path, PurePosixPath]] = []
    for item in ROOT_FILES:
        path = root / item
        if not path.is_file():
            raise RuntimeError(f"required archive file is missing: {item}")
        collected.append((path, PurePosixPath(item)))

    for source_root in SOURCE_ROOTS:
        base = root / source_root
        if not base.is_dir():
            raise RuntimeError(f"required archive directory is missing: {source_root}")
        for path in base.rglob("*"):
            relative = PurePosixPath(path.relative_to(root).as_posix())
            if excluded(relative):
                continue
            if path.is_symlink():
                raise RuntimeError(f"symbolic links are not allowed in deployment archives: {relative}")
            if path.is_file():
                collected.append((path, relative))

    collected.sort(key=lambda row: row[1].as_posix())
    return collected


def validate_file(path: Path, relative: PurePosixPath) -> bytes:
    data = path.read_bytes()
    if any(marker in data for marker in PEM_MARKERS):
        raise RuntimeError(f"private key material detected in archive source: {relative}")
    return data


def create_archive(root: Path, output: Path) -> dict[str, object]:
    root = root.resolve()
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    files = collect_files(root)
    total_source_bytes = 0

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, relative in files:
            data = validate_file(path, relative)
            total_source_bytes += len(data)
            info = zipfile.ZipInfo(relative.as_posix(), FIXED_ZIP_TIME)
            executable = bool(path.stat().st_mode & stat.S_IXUSR)
            info.external_attr = (0o755 if executable else 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compresslevel=9)

    archive_bytes = output.stat().st_size
    if archive_bytes > MAX_ARCHIVE_BYTES:
        output.unlink(missing_ok=True)
        raise RuntimeError(
            f"archive exceeds Hostinger's 50 MB limit: {archive_bytes} bytes"
        )

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    return {
        "schemaVersion": 1,
        "provider": "hostinger-web-apps",
        "archive": output.name,
        "sha256": digest,
        "fileCount": len(files),
        "sourceBytes": total_source_bytes,
        "archiveBytes": archive_bytes,
        "maxArchiveBytes": MAX_ARCHIVE_BYTES,
        "containsSecrets": False,
        "deploymentOptions": {
            "node_version": 22,
            "package_manager": "npm",
            "root_directory": ".",
            "build_script": "build",
            "app_type": None,
            "entry_file": None,
        },
        "status": "PREPARED_NOT_DEPLOYED",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()

    result = create_archive(args.root, args.output)
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
