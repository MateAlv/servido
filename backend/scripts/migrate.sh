#!/bin/sh
# Applies the migrations before the dev server starts (docker-compose.yml, compose.local.yml).
if ! alembic upgrade head; then
  echo "If it says \"Can't locate revision\", the local database has a migration from another branch:" >&2
  echo "run 'make reset-db' (it deletes the local data) and then 'make up' again." >&2
  exit 1
fi
