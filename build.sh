#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$ROOT/dist"

echo "=== Building webOS package (.ipk) ==="
ares-package -o "$ROOT/dist" "$ROOT/webos-app"
echo "=== Done! Package generated in dist/ ==="
ls -lh "$ROOT/dist"/*.ipk
