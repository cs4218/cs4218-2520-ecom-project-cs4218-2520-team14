#!/bin/bash
set -e  # exit immediately if any command fails

# ── Config — override any of these with environment variables ────────────────
MONGO_URI="mongodb://localhost:27017"
ADMIN_EMAIL="admin@test.com"
ADMIN_PASSWORD="admin123"
CATEGORY_NAME="Volume Test Category"
PRODUCT_NAME="Volume Seed Product"
CATEGORY_TEST_FILE="tests/categories.volume.js"
PRODUCT_TEST_FILE="tests/products.volume.js"
ORDER_TEST_FILE="tests/orders.volume.js"
USER_TEST_FILE="tests/users.volume.js"
OVERALL_TEST_FILE="tests/overall.volume.js"

# ── Helper ───────────────────────────────────────────────────────────────────
log() { echo ""; echo "──────────────────────────────────────────"; echo "  $1"; echo "──────────────────────────────────────────"; }

reset_and_seed() {
  MONGO_URI=$MONGO_URI \
    node ./teardown.js

  MONGO_URI=$MONGO_URI \
  ADMIN_EMAIL=$ADMIN_EMAIL \
  ADMIN_PASSWORD=$ADMIN_PASSWORD \
  CATEGORY_NAME=$CATEGORY_NAME \
  PRODUCT_NAME=$PRODUCT_NAME \
    node ./setup.js
}

# ── 1. Seed ──────────────────────────────────────────────────────────────────
log "STEP 1: Creating admin account, test category, and seed product"
MONGO_URI=$MONGO_URI \
ADMIN_EMAIL=$ADMIN_EMAIL \
ADMIN_PASSWORD=$ADMIN_PASSWORD \
CATEGORY_NAME=$CATEGORY_NAME \
PRODUCT_NAME=$PRODUCT_NAME \
  node ./setup.js

# ── 2. k6 ────────────────────────────────────────────────────────────────────
set +e
CATEGORY_K6_EXIT=0
PRODUCT_K6_EXIT=0
ORDER_K6_EXIT=0
USER_K6_EXIT=0
OVERALL_K6_EXIT=0

# log "STEP 2A: Resetting and seeding before category test"
# reset_and_seed

# log "STEP 2A: Running category volume test — $CATEGORY_TEST_FILE"

# k6 run \
#   -e ADMIN_EMAIL=$ADMIN_EMAIL \
#   -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
#   --out csv=results.categories.csv \
#   $CATEGORY_TEST_FILE
# CATEGORY_K6_EXIT=$?  # threshold failures return non-zero

# log "STEP 2B: Resetting and seeding before product test"
# reset_and_seed

# log "STEP 2B: Running product volume test — $PRODUCT_TEST_FILE"

# k6 run \
#   -e ADMIN_EMAIL=$ADMIN_EMAIL \
#   -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
#   -e CATEGORY_NAME="$CATEGORY_NAME" \
#   --out csv=results.products.csv \
#   $PRODUCT_TEST_FILE
# PRODUCT_K6_EXIT=$?  # threshold failures return non-zero

# log "STEP 2C: Resetting and seeding before order test"
# reset_and_seed

# log "STEP 2C: Running order volume test — $ORDER_TEST_FILE"

# k6 run \
#   -e ADMIN_EMAIL=$ADMIN_EMAIL \
#   -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
#   -e PRODUCT_NAME="$PRODUCT_NAME" \
#   --out csv=results.orders.csv \
#   $ORDER_TEST_FILE
# ORDER_K6_EXIT=$?  # threshold failures return non-zero

# log "STEP 2D: Resetting and seeding before user test"
# reset_and_seed

# log "STEP 2D: Running user volume test — $USER_TEST_FILE"

# k6 run \
#   -e ADMIN_EMAIL=$ADMIN_EMAIL \
#   -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
#   --out csv=results.users.csv \
#   $USER_TEST_FILE
# USER_K6_EXIT=$?  # threshold failures return non-zero

# log "STEP 2E: Resetting and seeding before overall test"
# reset_and_seed

log "STEP 2E: Running overall volume test — $OVERALL_TEST_FILE"

k6 run \
  -e ADMIN_EMAIL=$ADMIN_EMAIL \
  -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
  -e CATEGORY_NAME="$CATEGORY_NAME" \
  -e PRODUCT_NAME="$PRODUCT_NAME" \
  --out csv=results.overall.csv \
  $OVERALL_TEST_FILE
OVERALL_K6_EXIT=$?  # threshold failures return non-zero

if [ $CATEGORY_K6_EXIT -ne 0 ] || [ $PRODUCT_K6_EXIT -ne 0 ] || [ $ORDER_K6_EXIT -ne 0 ] || [ $USER_K6_EXIT -ne 0 ] || [ $OVERALL_K6_EXIT -ne 0 ]; then
  K6_EXIT=1
else
  K6_EXIT=0
fi
set -e

# ── 3. Teardown ──────────────────────────────────────────────────────────────
# Runs regardless of whether k6 passed or failed thresholds
log "STEP 3: Deleting admin account and test category"
MONGO_URI=$MONGO_URI \
  node ./teardown.js

# ── 4. Report ────────────────────────────────────────────────────────────────
log "DONE"
# if [ $K6_EXIT -eq 0 ]; then
#   echo "  ✅ k6 passed all thresholds"
# else
#   echo "  ⚠️  k6 exited with code $K6_EXIT (threshold breach or error)"
#   echo "  This may be an expected finding — check results/ for details"
# fi

# exit $K6_EXIT
