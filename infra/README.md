
#!/bin/sh
# Initializes PostGIS in the shared RideFix database.
# POSTGRES_DB creates ridefix_db during first-time volume initialization.
set -eu

echo "Enabling PostGIS in the shared RideFix database: ${POSTGRES_DB}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"

echo "Shared RideFix database initialized successfully."
