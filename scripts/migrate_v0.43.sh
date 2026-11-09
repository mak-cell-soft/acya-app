#!/bin/bash
set -euo pipefail

# ==============================================================================
# Multi-Tenant Migration Runner: v0.43 — Vehicle Delivery Tracking
# Target: wood-app-db on 8cdff3364501_wood-app-postgres
# ==============================================================================

CONTAINER="8cdff3364501_wood-app-postgres"
DB="wood-app-db"
PGUSER="postgres"
MIGRATION_FILE="/home/ubuntu/acya-app/wood-app.api/db/wood/v0.43/01_add_delivery_tracking.sql"

echo "=============================================================================="
echo " ACYA Élancé — Multi-Tenant Migration: v0.43 (tbl_delivery_tracking)"
echo " Target DB: $DB | Container: $CONTAINER"
echo " Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=============================================================================="

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "ERROR: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

# 1. Discover all tenants registered in bo_tbl_enterprise and PostgreSQL schemata
echo ""
echo "--> 1. Discovering tenant schemas..."
SCHEMAS=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
  -c "SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
      ORDER BY schema_name;")

TOTAL_DISCOVERED=0
for s in $SCHEMAS; do
    TOTAL_DISCOVERED=$((TOTAL_DISCOVERED + 1))
    echo "  [FOUND] $s"
done
echo "Total schemas discovered: $TOTAL_DISCOVERED"

# 2. Check pre-migration status
echo ""
echo "--> 2. Checking pre-migration status for tbl_delivery_tracking..."
ALREADY_EXISTING=0
for s in $SCHEMAS; do
    EXISTS=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
      -c "SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = '$s' AND table_name = 'tbl_delivery_tracking'
          );")
    if [ "$EXISTS" = "t" ]; then
        ALREADY_EXISTING=$((ALREADY_EXISTING + 1))
        echo "  [EXISTS] $s"
    else
        echo "  [PENDING] $s"
    fi
done

# 3. Execute migration script
echo ""
echo "--> 3. Executing migration $MIGRATION_FILE ..."
OUTPUT=$(sudo docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 < "$MIGRATION_FILE" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: Migration execution failed!"
    echo "$OUTPUT"
    exit 1
fi
echo "Migration script executed successfully."

# 4. Verification and Per-Tenant Audit
echo ""
echo "--> 4. Verifying post-migration state across all schemas..."
SUCCESS_COUNT=0
ALREADY_UP_TO_DATE=0
FAILED_COUNT=0

for s in $SCHEMAS; do
    # Check table
    TBL_EXISTS=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
      -c "SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = '$s' AND table_name = 'tbl_delivery_tracking'
          );")

    # Check columns count
    COL_COUNT=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
      -c "SELECT count(*) FROM information_schema.columns 
          WHERE table_schema = '$s' AND table_name = 'tbl_delivery_tracking';")

    # Check primary key
    PK_EXISTS=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
      -c "SELECT count(*) FROM information_schema.table_constraints 
          WHERE table_schema = '$s' AND table_name = 'tbl_delivery_tracking' AND constraint_type = 'PRIMARY KEY';")

    # Check unique index
    UQ_INDEX=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
      -c "SELECT count(*) FROM pg_indexes 
          WHERE schemaname = '$s' AND tablename = 'tbl_delivery_tracking' AND indexname = 'idx_tbl_delivery_tracking_doc_active';")

    # Check migration history
    HIST_EXISTS=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
      -c "SELECT count(*) FROM \"$s\".\"__EFMigrationsHistory\" 
          WHERE \"MigrationId\" = '20261109110000_AddDeliveryTrackingTable';")

    if [ "$TBL_EXISTS" = "t" ] && [ "$COL_COUNT" -eq 16 ] && [ "$PK_EXISTS" -ge 1 ] && [ "$UQ_INDEX" -ge 1 ] && [ "$HIST_EXISTS" -ge 1 ]; then
        echo "  [OK] $s: Table present (16 columns), PK verified, Unique index verified, History entry verified."
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "  [FAIL] $s: Tbl=$TBL_EXISTS, Cols=$COL_COUNT/16, PK=$PK_EXISTS, UQ=$UQ_INDEX, Hist=$HIST_EXISTS"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

# 5. Idempotency Test (Re-run test)
echo ""
echo "--> 5. Testing idempotency: re-running migration script..."
RE_RUN_OUTPUT=$(sudo docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 < "$MIGRATION_FILE" 2>&1)
RE_RUN_CODE=$?

if [ $RE_RUN_CODE -eq 0 ]; then
    echo "  [OK] Idempotency test passed: Script re-executed cleanly with zero errors."
else
    echo "  [FAIL] Idempotency test failed!"
    echo "$RE_RUN_OUTPUT"
    FAILED_COUNT=$((FAILED_COUNT + 1))
fi

echo ""
echo "=============================================================================="
echo " Migration Execution Summary"
echo "=============================================================================="
echo " Total Schemas Discovered   : $TOTAL_DISCOVERED"
echo " Successfully Migrated      : $SUCCESS_COUNT"
echo " Pre-existing Schemas       : $ALREADY_EXISTING"
echo " Failed Schemas             : $FAILED_COUNT"
echo " Idempotency Verified       : $([ $RE_RUN_CODE -eq 0 ] && echo 'YES' || echo 'NO')"
echo "=============================================================================="

if [ "$FAILED_COUNT" -gt 0 ]; then
    exit 1
fi

