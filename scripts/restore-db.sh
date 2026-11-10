#!/usr/bin/env bash
# Restore a backup made by scripts/backup-db.sh into a SEPARATE database, never over the live one.
#
# Usage:
#   ./scripts/restore-db.sh backups/chotomua_2026-11-10_090000.dump
#       -> local Docker Compose Postgres, database "chotomua_restoring" (dropped and recreated)
#   RESTORE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require' ./scripts/restore-db.sh <file>
#       -> any other EMPTY database (e.g. a new Supabase project); refused if it is the backend's own database
#
# After checking the restored data, switch the backend to it by pointing DB_* in backend/.env at that database
# (or, for the local one, rename chotomua_restoring to chotomua). The old database is left untouched for rollback.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/db-lib.sh"

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Cách dùng: $0 <file .dump>" >&2
  echo "Các bản sao lưu hiện có:" >&2
  ls -1t "$ROOT/backups"/chotomua_*.dump 2>/dev/null >&2 || true
  exit 1
fi

if [ -n "${RESTORE_URL:-}" ]; then
  # Parse postgresql://user:pass@host:port/db?sslmode=...
  rest="${RESTORE_URL#*://}"
  creds="${rest%%@*}"; hostpart="${rest#*@}"
  T_USER="${creds%%:*}"; T_PASS="${creds#*:}"
  hp="${hostpart%%/*}"; T_HOST="${hp%%:*}"; T_PORT="${hp#*:}"; [ "$T_PORT" = "$hp" ] && T_PORT=5432
  dbq="${hostpart#*/}"; T_NAME="${dbq%%\?*}"
  T_SSL="require"; case "$dbq" in *sslmode=*) T_SSL="${dbq##*sslmode=}"; T_SSL="${T_SSL%%&*}" ;; esac
  load_source_db
  if [ "$T_HOST" = "$SRC_HOST" ] && [ "$T_NAME" = "$SRC_NAME" ]; then
    echo "Từ chối: RESTORE_URL trỏ vào chính CSDL backend đang dùng. Hãy phục hồi vào một CSDL trống khác." >&2
    exit 1
  fi
  CREATE_LOCAL=0
  LABEL="CSDL $T_NAME trên $T_HOST (phải đang trống)"
else
  T_HOST="$LOCAL_HOST" T_PORT="$LOCAL_PORT" T_USER="$LOCAL_USER" T_PASS="$LOCAL_PASSWORD" T_SSL="disable"
  T_NAME="chotomua_restoring"
  CREATE_LOCAL=1
  LABEL="CSDL tạm $T_NAME trên Postgres local (Docker Compose, cổng $LOCAL_PORT) — sẽ bị xoá và tạo lại"
fi

echo "Phục hồi $FILE"
echo "  vào: $LABEL"
read -r -p "Tiếp tục? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Đã huỷ."
  exit 1
fi

if [ "$CREATE_LOCAL" = 1 ]; then
  pg_tool psql "$T_HOST" "$T_PORT" "$T_USER" "$T_PASS" "$T_SSL" -d postgres -v ON_ERROR_STOP=1 -q \
    -c "DROP DATABASE IF EXISTS $T_NAME;" -c "CREATE DATABASE $T_NAME;"
fi

# --no-owner/--no-privileges: Supabase roles do not exist elsewhere. "schema public already exists" is expected
# and harmless, so errors are reported but do not stop the restore; the row check below is the real verification.
pg_tool pg_restore "$T_HOST" "$T_PORT" "$T_USER" "$T_PASS" "$T_SSL" -d "$T_NAME" \
  --no-owner --no-privileges < "$FILE" || echo "(pg_restore báo lỗi ở trên — kiểm tra kết quả bên dưới)"

echo "Kiểm tra dữ liệu đã phục hồi:"
pg_tool psql "$T_HOST" "$T_PORT" "$T_USER" "$T_PASS" "$T_SSL" -d "$T_NAME" -q -At -F ' | ' -c "
  select 'bảng: ' || count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';
  select 'migration mới nhất: V' || max(version::int) from flyway_schema_history where success;
  select 'users: ' || count(*) from users;
  select 'orders: ' || count(*) from orders;
  select 'invoices: ' || count(*) from invoices;"

if [ "$CREATE_LOCAL" = 1 ]; then
  echo "Nếu dữ liệu đúng, chuyển sang dùng bản phục hồi (giữ bản cũ để quay lại):"
  echo "  docker exec shopee-postgres-1 psql -U chotomua -d postgres -c \"ALTER DATABASE chotomua RENAME TO chotomua_old;\""
  echo "  docker exec shopee-postgres-1 psql -U chotomua -d postgres -c \"ALTER DATABASE chotomua_restoring RENAME TO chotomua;\""
else
  echo "Nếu dữ liệu đúng, đổi DB_* trong backend/.env sang CSDL này rồi khởi động lại backend."
fi
