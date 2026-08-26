#!/usr/bin/env bash
# Consumer type-check against the ACTUAL npm-packed artifact (issue #13).
#
# `npm pack` the built library, extract the tarball into a local
# node_modules/@lifekit-hq/ui, and compile consumer.ts with
# skipLibCheck:false resolving through that package — so the check exercises
# real package resolution (package.json `exports`, `files` filtering, what
# actually ships in the tarball), not a tsconfig path alias into dist/.
set -euo pipefail
cd "$(dirname "$0")"
root="$(cd ../.. && pwd)"

if [[ ! -d "$root/dist/lifekit-hq/ui" ]]; then
  echo "consumer-type-check: dist/lifekit-hq/ui missing — run 'npm run build' first" >&2
  exit 1
fi

rm -rf .tmp node_modules
mkdir -p .tmp node_modules/@lifekit-hq
dest="$PWD/.tmp"
(cd "$root" && npm pack ./dist/lifekit-hq/ui --pack-destination "$dest" >/dev/null)
tar -xzf .tmp/lifekit-hq-ui-*.tgz -C .tmp
mv .tmp/package node_modules/@lifekit-hq/ui

"$root/node_modules/.bin/tsc" --project tsconfig.json
echo "consumer-type-check: OK (compiled against the npm-packed artifact)"
