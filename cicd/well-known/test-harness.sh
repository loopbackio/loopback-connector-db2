#!/bin/sh
export POSIXLY_CORRECT=1
set -euv

export DB2_USERNAME=db2inst1
export DB2_PASSWORD=P00lGnorts
export DB2_HOSTNAME=localhost
export DB2_PORTNUM=50000
export DB2_DATABASE=mydb

ORIG_DIR="$(pwd)"
cd "$(dirname "$0")/../.."
BASE_DIR="$(pwd)"

CI_NODEJS_AUTOINSTALL_DIR="${CI_NODEJSAUTOINSTALL_DIR:-}"
STARTDB2_SCRIPT="$BASE_DIR/cicd/vendor/setup-db2/start-db2.sh"

STEP_COUNT=1

step () {
  printf "\n\n============================================================================\n"
  printf 'STEP #%d: %s\n' "$STEP_COUNT" "$1"
  printf "\n============================================================================\n\n"
  STEP_COUNT="$((STEP_COUNT + 1))"
}

step 'Bootstrap dependencies'
npm ci --prefer-offline

step 'Bootstrap overriding dependencies'
if [  "$CI_NODEJS_AUTOINSTALL_DIR" != '' ]; then
  printf "$CI_NODEJS_AUTOINSTALL_DIR" |
    xargs -d: \
      find \
        "$CI_NODEJS_AUTOINSTALL_DIR" \
        -iname '*.tgz' \
        -exec \
          npm install {} \;
fi
npm install --prefer-offline

step 'Start DB2 LUW server'
"$STARTDB2_SCRIPT" \
  -l accept \
  -V "$DB2_VERSION" \
  -p 'P00lGnorts'

step 'Run tests'
npm run pretest --ignore-scripts
npm test --ignore-scripts

step 'Teardown DB2 LUW server'
"$STARTDB2_SCRIPT" -C

cd "$ORIG_DIR"
