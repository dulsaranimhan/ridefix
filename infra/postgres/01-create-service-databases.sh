#!/bin/sh
# Runs once, the first time the Postgres volume is created.
# Creates one database and one login per RideFix service. Each login owns only its own database,
# so a service cannot read or write another service's tables (architecture rule 4).
set -eu

for svc in request matching bidding tracking payment notification; do
  echo "Creating ${svc}_db owned by ${svc}_svc"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE ${svc}_svc LOGIN PASSWORD '${SERVICE_DB_PASSWORD}';
CREATE DATABASE ${svc}_db OWNER ${svc}_svc;
REVOKE ALL ON DATABASE ${svc}_db FROM PUBLIC;
SQL
done

# Only the Matching Service needs PostGIS.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname matching_db \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# The postgis image installs PostGIS into the default databases too; we do not need it there.
