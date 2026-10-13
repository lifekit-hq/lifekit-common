#!/usr/bin/env bash
# Consumer type-check against the ACTUAL npm-packed artifact (issue #13).
#
# `npm pack` the built libraries, extract the tarballs into local
# node_modules/@lifekit-hq/{ui,charts-core,core,elements}, and compile consumer.ts with
# skipLibCheck:false resolving through those packages — so the check exercises
# real package resolution (package.json `exports`, `files` filtering, what
# actually ships in the tarball), not a tsconfig path alias into dist/.
#
# @lifekit-hq/charts-core is packed alongside ui because ui's type rollup
# re-exports charts-core types (BarSeries, ChartPoint, etc.) as part of its
# public API — consumers need both installed to compile. @lifekit-hq/core is packed for the same
# reason: ui's rollup imports from `@lifekit-hq/core/format` (e.g. RelativeTimePipe's `TimeInput`).
# `@lifekit-hq/elements` is packed because `cmn-appearance-settings` renders `lk-theme-picker`.
# ui declares all three as `dependencies`; this fixture extracts tarballs by hand, so it installs them itself.
set -euo pipefail
cd "$(dirname "$0")"
root="$(cd ../.. && pwd)"

if [[ ! -d "$root/dist/lifekit-hq/ui" ]]; then
  echo "consumer-type-check: dist/lifekit-hq/ui missing — run 'npm run build' first" >&2
  exit 1
fi

for lib in charts-core core elements; do
  if [[ ! -d "$root/dist/lifekit-hq/$lib" ]]; then
    echo "consumer-type-check: dist/lifekit-hq/$lib missing — run 'npm run build' first" >&2
    exit 1
  fi
done

rm -rf .tmp node_modules
mkdir -p .tmp node_modules/@lifekit-hq
dest="$PWD/.tmp"

(cd "$root" && npm pack ./dist/lifekit-hq/charts-core --pack-destination "$dest" >/dev/null)
tar -xzf .tmp/lifekit-hq-charts-core-*.tgz -C .tmp
mv .tmp/package node_modules/@lifekit-hq/charts-core

(cd "$root" && npm pack ./dist/lifekit-hq/core --pack-destination "$dest" >/dev/null)
tar -xzf .tmp/lifekit-hq-core-*.tgz -C .tmp
mv .tmp/package node_modules/@lifekit-hq/core

(cd "$root" && npm pack ./dist/lifekit-hq/elements --pack-destination "$dest" >/dev/null)
tar -xzf .tmp/lifekit-hq-elements-*.tgz -C .tmp
mv .tmp/package node_modules/@lifekit-hq/elements

(cd "$root" && npm pack ./dist/lifekit-hq/ui --pack-destination "$dest" >/dev/null)
tar -xzf .tmp/lifekit-hq-ui-*.tgz -C .tmp
mv .tmp/package node_modules/@lifekit-hq/ui

# The fixture sits inside the repo, so a build-machine-relative import("../../dist/...") can resolve
# by accident here; scan the declarations directly so it cannot slip through.
node "$root/scripts/check-dts-portable.mjs" "$root/dist/lifekit-hq"

"$root/node_modules/.bin/tsc" --project tsconfig.json
echo "consumer-type-check: OK (compiled against the npm-packed artifact)"
