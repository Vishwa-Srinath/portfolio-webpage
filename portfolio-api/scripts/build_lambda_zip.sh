#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$API_DIR/.lambda-build"
DIST_DIR="$API_DIR/dist"
ARTIFACT="$DIST_DIR/portfolio-api-lambda.zip"
PYTHON_BIN="${PYTHON_BIN:-python3}"
LAMBDA_PYTHON_VERSION="${LAMBDA_PYTHON_VERSION:-3.12}"
LAMBDA_PLATFORM="${LAMBDA_PLATFORM:-manylinux2014_x86_64}"

command -v "$PYTHON_BIN" >/dev/null || {
  echo "Python executable not found: $PYTHON_BIN" >&2
  exit 1
}
command -v zip >/dev/null || {
  echo "The zip command is required." >&2
  exit 1
}

# Guard the cleanup target before removing generated files.
if [[ "$BUILD_DIR" != "$API_DIR/.lambda-build" ]]; then
  echo "Refusing to clean unexpected build directory: $BUILD_DIR" >&2
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"
rm -f "$ARTIFACT"

echo "Installing Lambda dependencies for Python $LAMBDA_PYTHON_VERSION / x86_64..."
"$PYTHON_BIN" -m pip install \
  --requirement "$API_DIR/requirements-lambda.txt" \
  --target "$BUILD_DIR" \
  --platform "$LAMBDA_PLATFORM" \
  --implementation cp \
  --python-version "$LAMBDA_PYTHON_VERSION" \
  --only-binary=:all: \
  --upgrade

cp -R "$API_DIR/app" "$BUILD_DIR/app"
cp "$API_DIR/lambda_handler.py" "$BUILD_DIR/lambda_handler.py"

# Remove files that Lambda does not need.
find "$BUILD_DIR" -type d -name '__pycache__' -prune -exec rm -rf {} +
find "$BUILD_DIR" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete

(
  cd "$BUILD_DIR"
  zip -q -r "$ARTIFACT" .
)

ZIP_BYTES=$(stat -c '%s' "$ARTIFACT")
UNZIPPED_BYTES=$(du -sb "$BUILD_DIR" | cut -f1)
ZIP_LIMIT=$((50 * 1024 * 1024))
UNZIPPED_LIMIT=$((250 * 1024 * 1024))

if (( ZIP_BYTES > ZIP_LIMIT )); then
  echo "Deployment ZIP exceeds Lambda's direct-upload 50 MB limit." >&2
  exit 1
fi
if (( UNZIPPED_BYTES > UNZIPPED_LIMIT )); then
  echo "Deployment package exceeds Lambda's 250 MB uncompressed limit." >&2
  exit 1
fi

echo "Built $ARTIFACT"
du -h "$ARTIFACT"
du -sh "$BUILD_DIR"
