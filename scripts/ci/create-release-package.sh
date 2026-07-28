#!/usr/bin/env bash
set -Eeuo pipefail

ARTIFACT_DIR="${1:-artifacts/build}"
OUTPUT_DIR="${2:-artifacts/release}"
VERSION="${RELEASE_VERSION:-$(node -p "require('./package.json').version")}"
SOURCE_REVISION="${GITHUB_SHA:-${SOURCE_REVISION:-unknown}}"
PACKAGE_NAME="paysave-os-${VERSION}-${SOURCE_REVISION:0:12}-release-package.tar.gz"
archive_files=("paysave-os-image.tar.gz" "deployment-manifest.json" "npm-sbom.cdx.json" "SHA256SUMS")

for file in "${archive_files[@]}"; do
  [[ -f "${ARTIFACT_DIR}/${file}" ]] || { echo "ERROR: missing ${ARTIFACT_DIR}/${file}" >&2; exit 1; }
done
node scripts/ci/validate-deployment-manifest.mjs "${ARTIFACT_DIR}/deployment-manifest.json"
(
  cd "${ARTIFACT_DIR}"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum --check SHA256SUMS
  else
    shasum -a 256 -c SHA256SUMS
  fi
)

for report in PIPELINE_REPORT_v1.0.md COVERAGE_REPORT_v1.0.md ARTIFACT_REPORT_v1.0.md; do
  if [[ -f "docs/cicd/${report}" ]]; then
    cp "docs/cicd/${report}" "${ARTIFACT_DIR}/${report}"
    archive_files+=("${report}")
  fi
done
mkdir -p "${OUTPUT_DIR}"
tar -C "${ARTIFACT_DIR}" -czf "${OUTPUT_DIR}/${PACKAGE_NAME}" "${archive_files[@]}"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT_DIR}/${PACKAGE_NAME}" > "${OUTPUT_DIR}/${PACKAGE_NAME}.sha256"
else
  shasum -a 256 "${OUTPUT_DIR}/${PACKAGE_NAME}" > "${OUTPUT_DIR}/${PACKAGE_NAME}.sha256"
fi
echo "RELEASE_PACKAGE_CREATED ${OUTPUT_DIR}/${PACKAGE_NAME} deploy=false"
