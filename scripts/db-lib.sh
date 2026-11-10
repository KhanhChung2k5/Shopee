# Shared helpers for backup-db.sh / restore-db.sh. Sourced, not run directly.
#
# Connection settings come from backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSLMODE) —
# the same database the backend uses (Supabase). Values are read into variables only; nothing is printed.
#
# Postgres client tools: a local pg_dump/pg_restore/psql is used when installed (must be version >= the server,
# i.e. 17 for Supabase); otherwise the same tool runs from the official postgres:17-alpine Docker image.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"

# Local Docker Compose database (docker-compose.yml), used as the safe default restore target.
LOCAL_HOST="localhost"
LOCAL_PORT="5434"
LOCAL_USER="chotomua"
LOCAL_PASSWORD="chotomua"

# Reads DB_* from backend/.env into SRC_* variables (no eval, no output).
load_source_db() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Không tìm thấy $ENV_FILE (cần DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)." >&2
    exit 1
  fi
  local key value
  while IFS='=' read -r key value; do
    key="$(echo "$key" | tr -d '[:space:]')"
    value="${value%$'\r'}"
    value="${value#\"}"; value="${value%\"}"; value="${value#\'}"; value="${value%\'}"
    case "$key" in
      DB_HOST) SRC_HOST="$value" ;;
      DB_PORT) SRC_PORT="$value" ;;
      DB_NAME) SRC_NAME="$value" ;;
      DB_USER) SRC_USER="$value" ;;
      DB_PASSWORD) SRC_PASSWORD="$value" ;;
      DB_SSLMODE) SRC_SSLMODE="$value" ;;
    esac
  done < <(grep -E '^[[:space:]]*DB_[A-Z]+=' "$ENV_FILE")
  : "${SRC_HOST:?DB_HOST trống trong backend/.env}" "${SRC_NAME:?DB_NAME trống trong backend/.env}"
  : "${SRC_USER:?DB_USER trống trong backend/.env}" "${SRC_PASSWORD:?DB_PASSWORD trống trong backend/.env}"
  SRC_PORT="${SRC_PORT:-5432}"
  SRC_SSLMODE="${SRC_SSLMODE:-require}"
}

# pg_tool <pg_dump|pg_restore|psql> <host> <port> <user> <password> <sslmode> [args...]
# stdin/stdout pass through, so dumps can be streamed to and from files on the host.
pg_tool() {
  local tool="$1" host="$2" port="$3" user="$4" password="$5" sslmode="$6"
  shift 6
  if command -v "$tool" >/dev/null 2>&1; then
    PGPASSWORD="$password" PGSSLMODE="$sslmode" "$tool" -h "$host" -p "$port" -U "$user" "$@"
  else
    if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
      echo "Cần $tool (PostgreSQL 17) hoặc Docker đang chạy." >&2
      exit 1
    fi
    # Inside the container "localhost" is the container itself; the host machine is host.docker.internal.
    case "$host" in localhost|127.0.0.1) host="host.docker.internal" ;; esac
    PGPASSWORD="$password" PGSSLMODE="$sslmode" MSYS_NO_PATHCONV=1 \
      docker run --rm -i -e PGPASSWORD -e PGSSLMODE "$PG_IMAGE" "$tool" -h "$host" -p "$port" -U "$user" "$@"
  fi
}
