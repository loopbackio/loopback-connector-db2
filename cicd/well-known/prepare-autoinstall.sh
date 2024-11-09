#!/bin/sh
export POSIXLY_CORRECT=1
set -euv

ORIG_DIR="$(pwd)"
cd "$(dirname "$0")/../.."
BASE_DIR="$(pwd)"

CI_NODEJS_AUTOINSTALL_DIR="$BASE_DIR/cicd/tmp/nodejs-autoinstall"
PREPARE_POSTINSTALL_SCRIPT="$BASE_DIR/cicd/tmp/well-known/set-env/post-prepare-autoinstall.sh"

STEP_COUNT=1

step () {
  printf "\n\n============================================================================\n"
  printf 'STEP #%d: %s\n' "$STEP_COUNT" "$1"
  printf "\n============================================================================\n\n"
  STEP_COUNT="$((STEP_COUNT + 1))"
}

step 'Bootstrap dependencies'
npm ci --prefer-offline --ignore-scripts

step 'Pack for autoinstall'
mkdir -p "CI_NODEJS_AUTOINSTALL_DIR"
npm pack --pack-destination="$CI_NODEJS_AUTOINSTALL_DIR"

mkdir -p "$(dirname "$PREPARE_POSTINSTALL_SCRIPT")"
echo "export CI_NODEJS_AUTOINSTALL_DIR=\"$CI_NODEJS_AUTOINSTALL_DIR\"" >"$PREPARE_POSTINSTALL_SCRIPT"
chmod +x "$PREPARE_POSTINSTALL_SCRIPT"

cd "$ORIG_DIR"
