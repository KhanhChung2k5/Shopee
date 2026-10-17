#!/usr/bin/env bash
# Restore a Chợ Tốt Mua database backup produced by scripts/backup-db.sh.
#
# Usage:
#   ./scripts/restore-db.sh backups/chotomua_2026-09-18_140500.dump
#
# WARNING: this drops and recreates all data in the target database.
set -euo pipefail

CONTAINER="shopee-postgres-1"
DB_NAME="chotomua"
DB_USER="chotomua"

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <path-to-.dump-file>" >&2
  echo "Available backups:" >&2
  ls -1t "$(dirname "${BASH_SOURCE[0]}")/../backups"/chotomua_*.dump 2>/dev/null >&2
  exit 1
fi

read -r -p "This will DROP and recreate all data in '$DB_NAME'. Continue? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 1
fi

echo "Copying $FILE into container '$CONTAINER'..."
docker cp "$FILE" "$CONTAINER:/tmp/restore.dump"

echo "Dropping and recreating '$DB_NAME'..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_restoring;"
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME}_restoring;"
# MSYS_NO_PATHCONV scoped to just this call — see backup-db.sh for why.
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" pg_restore -U "$DB_USER" -d "${DB_NAME}_restoring" /tmp/restore.dump

echo "Restored into '${DB_NAME}_restoring'. Verify it, then swap it in manually:"
echo "  docker exec $CONTAINER psql -U $DB_USER -d postgres -c \"ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;\""
echo "  docker exec $CONTAINER psql -U $DB_USER -d postgres -c \"ALTER DATABASE ${DB_NAME}_restoring RENAME TO $DB_NAME;\""
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" rm -f /tmp/restore.dump
