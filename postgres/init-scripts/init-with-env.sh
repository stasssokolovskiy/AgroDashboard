#!/bin/bash
set -e

ENV_VARS=()
for var in $(compgen -e); do
    ENV_VARS+=(-v "$var=${!var}")
done

for file in /docker-entrypoint-initdb.d/raw-sql-scripts/*.sql; do
    [ -e "$file" ] || continue
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" "${ENV_VARS[@]}" -f "$file"
done
