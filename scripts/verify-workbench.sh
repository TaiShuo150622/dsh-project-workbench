#!/usr/bin/env bash
# Run in an isolated verification environment; callers choose its host and screen session.
set -u
evidence=${1:?Usage: bash scripts/verify-workbench.sh /absolute/evidence-directory}
case "$evidence" in /*) ;; *) echo 'Evidence directory must be absolute' >&2; exit 2;; esac
mkdir -p "$evidence" || exit 2
cd "$(dirname "$0")/.." || exit 2
npm ci --no-audit --no-fund > "$evidence/install.log" 2>&1 || exit 2
result=0
node --test tests/*.test.mjs > "$evidence/tests.tap" 2>&1
code=$?; printf '%s\n' "$code" > "$evidence/tests.exit"
if [ "$code" -ne 0 ]; then result=1; fi
node scripts/build.mjs > "$evidence/build.log" 2>&1
code=$?; printf '%s\n' "$code" > "$evidence/build.exit"
if [ "$code" -ne 0 ]; then result=1; fi
node scripts/mutation-check.mjs > "$evidence/mutations.log" 2>&1
code=$?; printf '%s\n' "$code" > "$evidence/mutations.exit"
if [ "$code" -ne 0 ]; then result=1; fi
date -u +%FT%TZ > "$evidence/completed.txt"
exit "$result"
