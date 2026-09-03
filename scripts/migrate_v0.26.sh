#!/bin/bash
# Migration script: v0.26 - Chantier feature
# Runs all 6 SQL files in order for every tenant schema in wood-app-db.
# Safe to re-run: all statements use CREATE TABLE IF NOT EXISTS.

CONTAINER="wood-app-postgres"
DB="wood-app-db"
PGUSER="postgres"

MIGRATION_DIR="/home/ubuntu/acya-app/wood-app.api/db/wood/v0.26"
FILES=(
  "01_chantier_projects.sql"
  "02_chantier_team.sql"
  "03_chantier_production.sql"
  "04_chantier_materials.sql"
  "05_chantier_vehicles.sql"
  "06_chantier_suivi.sql"
  "07_chantier_caisse.sql"
)

echo "============================================================"
echo " Migration v0.26 - Chantier feature"
echo " Target DB : $DB  |  Container: $CONTAINER"
echo "============================================================"

# Fetch all tenant schemas
SCHEMAS=$(sudo docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB" -t -A \
  -c "SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('public','information_schema','pg_catalog','pg_toast')
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name;")

if [ -z "$SCHEMAS" ]; then
  echo "ERROR: No tenant schemas found. Aborting."
  exit 1
fi

echo ""
echo "Tenant schemas to migrate:"
echo "$SCHEMAS" | while read -r s; do echo "  - $s"; done
echo ""

TENANT_COUNT=0
ERROR_COUNT=0

for SCHEMA in $SCHEMAS; do
  SCHEMA=$(echo "$SCHEMA" | tr -d '[:space:]')
  echo "------------------------------------------------------------"
  echo "Schema: $SCHEMA"
  echo "------------------------------------------------------------"
  TENANT_COUNT=$((TENANT_COUNT + 1))

  for SQL_FILE in "${FILES[@]}"; do
    FILE_PATH="$MIGRATION_DIR/$SQL_FILE"
    echo "  [RUN] $SQL_FILE ..."

    # Wrap in SET search_path so all tables land in the right schema
    SQL_CONTENT=$(cat "$FILE_PATH")
    WRAPPED_SQL="SET search_path TO \"${SCHEMA}\", public;
${SQL_CONTENT}"

    OUTPUT=$(echo "$WRAPPED_SQL" | sudo docker exec -i "$CONTAINER" \
        psql -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
      echo "  [OK]  $SQL_FILE"
    else
      echo "  [ERR] $SQL_FILE FAILED for schema $SCHEMA"
      echo "$OUTPUT"
      ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
  done
  echo ""
done

echo "============================================================"
echo " Migration complete"
echo "  Schemas processed : $TENANT_COUNT"
echo "  Errors            : $ERROR_COUNT"
echo "============================================================"

if [ "$ERROR_COUNT" -gt 0 ]; then
  exit 1
fi
