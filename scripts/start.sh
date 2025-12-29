#!/bin/bash

# 1. Capture the schema path from the first parameter ($1) or use default
# Since the script runs in /script, we look one level up for the prisma folder
SCHEMA_PATH=${1:-"../prisma/db.schema"}

# 2. Start Podman containers 
# We use -f to point to the compose file in the parent directory
echo "Starting services..."
podman-compose -f compose.yaml up -d

# 3. Probe for database readiness
echo -n "Waiting for Signalix DB to be ready..."
until podman exec signalix-postgres pg_isready -U signalix -d signalix_db > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " [ONLINE]"


 # 4. Set DATABASE_URL and run Prisma
# Adjust the connection string if your DB credentials differ
export DATABASE_URL="postgresql://signalix:signalix_passwd@localhost:5432/signalix_db"
echo "Pushing Prisma schema: $SCHEMA_PATH"
npx prisma db push --schema="$SCHEMA_PATH"

echo "Database is ready and tables are created."