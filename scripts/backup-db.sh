#!/usr/bin/env bash
# Logical backup of the Chợ Tốt Mua database (pg_dump, custom format).
#
# Usage:
#   ./scripts/backup-db.sh            # the database the backend uses (backend/.env, Supabase)
#   ./scripts/backup-db.sh --local    # the local Docker Compose database (localhost:5434/chotomua)
#
# Output: backups/chotomua_YYYY-MM-DD_HHMMSS.dump — schema "public" only (all application tables and
# flyway_schema_history; Supabase's own auth/storage schemas are not part of the application).
# pg_dump only reads: it takes shared locks and never changes data.
#
# Retention: keeps the 7 most recent backups. Schedule daily with cron / Windows Task Scheduler.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/db-lib.sh"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${KEEP:-7}"
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
FILE="$BACKUP_DIR/chotomua_${TIMESTAMP}.dump"

if [ "${1:-}" = "--local" ]; then
  HOST="$LOCAL_HOST" PORT="$LOCAL_PORT" NAME="chotomua" USER_="$LOCAL_USER" PASS="$LOCAL_PASSWORD" SSL="disable"
  LABEL="CSDL local (Docker Compose)"
else
  load_source_db
  HOST="$SRC_HOST" PORT="$SRC_PORT" NAME="$SRC_NAME" USER_="$SRC_USER" PASS="$SRC_PASSWORD" SSL="$SRC_SSLMODE"
  LABEL="CSDL của backend (backend/.env)"
fi

mkdir -p "$BACKUP_DIR"
echo "Sao lưu $LABEL -> $FILE"
if ! pg_tool pg_dump "$HOST" "$PORT" "$USER_" "$PASS" "$SSL" -d "$NAME" \
      --schema=public --format=custom --no-owner --no-privileges > "$FILE.part"; then
  rm -f "$FILE.part"
  echo "Sao lưu thất bại." >&2
  exit 1
fi
mv "$FILE.part" "$FILE"
echo "Đã ghi: $FILE ($(du -h "$FILE" | cut -f1))"

ls -1t "$BACKUP_DIR"/chotomua_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "Xoá bản cũ: $old"
  rm -f "$old"
done
