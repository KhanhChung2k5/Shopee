#!/usr/bin/env bash
# Logical backup of the Chợ Tốt Mua Postgres database, via pg_dump inside
# the running Docker container (no local psql/pg_dump install required).
#
# Usage:
#   ./scripts/backup-db.sh
#
# Output: backups/chotomua_YYYY-MM-DD_HHMMSS.dump (custom format, restore
# with pg_restore — see scripts/restore-db.sh).
#
# Retention: keeps the 7 most recent backups, deletes older ones. Schedule
# this script daily (cron / Windows Task Scheduler) for a simple 7-day
# rolling backup; schema itself is always reproducible from scratch via the
# Flyway migrations in backend/src/main/resources/db/migration.
set -euo pipefail

CONTAINER="shopee-postgres-1"
DB_NAME="chotomua"
DB_USER="chotomua"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
FILE="$BACKUP_DIR/chotomua_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Backing up '$DB_NAME' from container '$CONTAINER' -> $FILE"
# MSYS_NO_PATHCONV scoped to just this call: Windows Git Bash otherwise
# rewrites the /tmp/... (container-internal) path into a host Windows path.
# docker cp below must NOT have it set, since its destination IS a real host
# path that needs the normal conversion.
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/backup.dump"
docker cp "$CONTAINER:/tmp/backup.dump" "$FILE"
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" rm -f /tmp/backup.dump

echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"

# Retention: keep the 7 most recent .dump files, delete the rest.
KEEP=7
ls -1t "$BACKUP_DIR"/chotomua_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "Removing old backup: $old"
  rm -f "$old"
done
