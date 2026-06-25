#!/bin/bash
set -e

echo "=== STARTING INTEGRATION TEST ==="

# Generate dynamic tenant details to make test repeatable
RAND_NUM=$((1000 + RANDOM % 9000))
SLUG="demo${RAND_NUM}"
SCHEMA="tenant_${SLUG}"
echo "Test parameters: Slug=${SLUG}, Schema=${SCHEMA}"

# 1. Login to get token
echo "Logging in to Command Center..."
LOGIN_RESP=$(curl -s -k -X POST https://admin.acya.site/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}')

TOKEN=$(echo $LOGIN_RESP | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
echo "Token obtained successfully."

# 2. Register a new tenant (Unified Flow - Register & Provision automatically)
echo "Registering and provisioning new tenant '${SLUG}'..."
REG_RESP=$(curl -s -k -X POST https://admin.acya.site/api/admin/enterprise \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Demo Hospital ${RAND_NUM}\",
    \"slug\": \"${SLUG}\",
    \"email\": \"contact@${SLUG}.acya.site\",
    \"phone\": \"+33600000000\",
    \"schemaName\": \"${SCHEMA}\",
    \"connectionString\": \"Host=postgres;Port=5432;Database=wood-app-db;Username=postgres;Password=wood_app_strong_db_password_270326;\",
    \"plan\": \"Trial\",
    \"adminUsername\": \"demoadmin\",
    \"adminEmail\": \"admin@${SLUG}.acya.site\",
    \"adminPassword\": \"Demopassword123!\"
  }")

echo "Registration Response: $REG_RESP"
TENANT_ID=$(echo $REG_RESP | grep -o -i '"id":[0-9]*' | head -n1 | cut -d: -f2)
echo "Tenant registered. ID: $TENANT_ID"

# 4. Verify in PostgreSQL that the schema and admin user exist
echo "Verifying schema '${SCHEMA}' and 'tbl_app_user' inside PostgreSQL..."
sudo docker exec wood-app-postgres psql -U postgres -d wood-app-db -c "
  SET search_path TO ${SCHEMA};
  SELECT u.id, u.login, u.email, p.fullname, r.\"Permissions\"
  FROM tbl_app_user u
  JOIN tbl_person p ON u.idperson = p.id
  LEFT JOIN tbl_user_permissions r ON u.id = r.\"UserId\";
"

# 5. Clean up/Delete the tenant
echo "Deleting tenant '${SLUG}' (deprovision schema and delete registry)..."
DEL_RESP=$(curl -s -k -i -X DELETE "https://admin.acya.site/api/admin/enterprise/$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "Deletion completed."

# 6. Verify that the schema is gone
echo "Checking if schema '${SCHEMA}' was dropped from PostgreSQL..."
sudo docker exec wood-app-postgres psql -U postgres -d wood-app-db -c "
  SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${SCHEMA}';
"

echo "=== INTEGRATION TEST COMPLETED SUCCESSFULLY ==="
