-- Run this inside Postgres to set password to "password" (matches .env.production)
-- Usage: docker exec -i wood-app-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'password';"
ALTER USER postgres PASSWORD 'password';
