#!/bin/sh
# Database initialization script for Wood App
# Runs from Postgres /docker-entrypoint-initdb.d (mount ./db here)
# Creates APP_DB if set and runs all SQL migration scripts in wood/ in order
# NOTE: Keep this file with LF line endings (not CRLF) so it runs in the Linux container.

set -e

echo "Starting database initialization..."

# Create secondary database (APP_DB) if configured - API uses it for AppContextConnection
if [ -n "$APP_DB" ] && [ "$APP_DB" != "$POSTGRES_DB" ]; then
  echo "Creating database: $APP_DB"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$APP_DB'" | grep -q 1 \
    || psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$APP_DB\";"
fi

# Ensure EF migrations history table exists (some version scripts insert into it)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c \
  "CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (\"MigrationId\" varchar(150) NOT NULL PRIMARY KEY, \"ProductVersion\" varchar(32) NOT NULL);"

# Run the master EF Core migration script
MASTER_SCRIPT="/docker-entrypoint-initdb.d/FullDb_Migration/full_migration.sql"
if [ -f "$MASTER_SCRIPT" ]; then
  echo "Executing master migration script: full_migration.sql"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$MASTER_SCRIPT"
else
  echo "Warning: Master migration script not found at $MASTER_SCRIPT"
fi

# Ensure system user exists (referenced by some app logic)
echo "Seeding System user..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c \
  "INSERT INTO tbl_person (id, fullname, isdeleted, isappuser) VALUES (1, 'System', false, true) ON CONFLICT (id) DO NOTHING; SELECT setval(pg_get_serial_sequence('tbl_person', 'id'), (SELECT COALESCE(MAX(id), 1) FROM tbl_person));" 2>/dev/null || true

echo "Database initialization completed successfully!"
