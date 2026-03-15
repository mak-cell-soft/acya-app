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

# Run all version scripts in numerical order (v0.00, v0.01, ... v0.10)
# Normalize dir names to lowercase for sort so V0.09 runs with v0.09 order
BASE="/docker-entrypoint-initdb.d/wood"
for version_dir in $(ls -d "$BASE"/*/ 2>/dev/null | while read d; do
  v=$(basename "$d" | tr 'A-Z' 'a-z')
  echo "$v $d"
done | sort -V | cut -d' ' -f2-); do
  if [ -d "$version_dir" ]; then
    echo "Processing version: $(basename "$version_dir")"
    # v0.10 seed data references idappuser=1 -> tbl_person(id). Ensure system user exists.
    case "$(basename "$version_dir" | tr 'A-Z' 'a-z')" in
      v0.10)
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c \
          "INSERT INTO tbl_person (id, fullname, isdeleted, isappuser) VALUES (1, 'System', false, true) ON CONFLICT (id) DO NOTHING; SELECT setval(pg_get_serial_sequence('tbl_person', 'id'), (SELECT COALESCE(MAX(id), 1) FROM tbl_person));" 2>/dev/null || true
        ;;
    esac
    for sql_file in "$version_dir"/*.sql; do
      if [ -f "$sql_file" ]; then
        echo "Executing: $(basename "$sql_file")"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$sql_file"
      fi
    done
  fi
done

echo "Database initialization completed successfully!"
