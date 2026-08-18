#!/usr/bin/env bash
# npm login → bump version → publish @tonamson2/bee-router
# usage: ./scripts/publish-cli.sh [patch|minor|major|x.y.z]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/cli"
BUMP="${1:-patch}"

if ! npm whoami >/dev/null 2>&1; then
  echo "→ npm login"
  npm login
else
  echo "→ npm user: $(npm whoami)"
fi

echo "→ bump $BUMP"
npm --prefix "$ROOT" version "$BUMP" --no-git-tag-version >/dev/null
VER="$(node -p "require('$ROOT/package.json').version")"
npm --prefix "$CLI" version "$VER" --no-git-tag-version --allow-same-version >/dev/null
echo "   $VER"

if [[ ! -d "$CLI/node_modules/esbuild" ]]; then
  echo "→ npm install (cli, esbuild)"
  npm --prefix "$CLI" install
fi

echo "→ npm publish --access public"
cd "$CLI"
npm publish --access public

echo "✓ @tonamson2/bee-router@$VER"
echo "  npm i -g @tonamson2/bee-router"
echo "  bee-router"
