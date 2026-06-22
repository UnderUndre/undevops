#!/usr/bin/env bash
# Local variant of prod-exec.sh — runs commands against local containers or local psql
# Usage:
#   ./prod-exec-local.sh sql "SELECT 1;"           — Run SQL query against local DB (admin)
#   ./prod-exec-local.sh sql path/to/file.sql        — Execute .sql file against local DB
#   ./prod-exec-local.sh ai-sql "SELECT 1;"        — Run SQL query as ai_readonly user
#
# Environment (optional overrides):
#   LOCAL_DB_CONTAINER   - if set, use `docker exec` into this container and run psql there
#   LOCAL_DB_NAME        - database name (default: postgres)
#   LOCAL_DB_ADMIN       - admin user for psql (default: postgres)
#   LOCAL_AI_USER        - ai readonly user (default: ai_readonly)
#
# This script is intentionally conservative: it prefers docker exec -> psql inside container
# when LOCAL_DB_CONTAINER is set, otherwise attempts to use local `psql` binary. It does not
# perform any SSH or remote operations.

set -euo pipefail

DB_CONTAINER=${LOCAL_DB_CONTAINER:-}
DB_NAME=${LOCAL_DB_NAME:-postgres}
DB_ADMIN=${LOCAL_DB_ADMIN:-postgres}
AI_USER=${LOCAL_AI_USER:-ai_readonly}

usage() {
  cat <<EOF
Usage: $0 <command> [args]

Commands:
  sql "SQL_QUERY"            Run SQL as DB admin
  sql path/to/file.sql        Execute SQL file as DB admin
  ai-sql "SQL_QUERY"         Run SQL as ai_readonly (SELECT-only intended)
  help                       Show this message

Environment:
  LOCAL_DB_CONTAINER  Use docker exec <container> psql -U ... -d ... if set
  LOCAL_DB_NAME       Database name (default: postgres)
  LOCAL_DB_ADMIN      DB admin user (default: postgres)
  LOCAL_AI_USER       Readonly AI user (default: ai_readonly)

Notes:
  - If neither LOCAL_DB_CONTAINER is set nor local `psql` is available, the script will
    print instructions for installing psql or setting LOCAL_DB_CONTAINER.
  - This script is local-only and will NOT connect to remote servers.
EOF
}

run_psql_in_container() {
  local as_user=$1
  shift
  if [ -n "$DB_CONTAINER" ]; then
    if [ "$1" = "-f" ]; then
      # read from file on host and stream into container's psql stdin
      local file="$2"
      docker exec -i "$DB_CONTAINER" psql -U "$as_user" -d "$DB_NAME" < "$file"
    else
      local query="$*"
      docker exec "$DB_CONTAINER" psql -U "$as_user" -d "$DB_NAME" -c "$(printf '%q' "$query")"
    fi
  else
    if command -v psql >/dev/null 2>&1; then
      if [ "$1" = "-f" ]; then
        psql -U "$as_user" -d "$DB_NAME" -f "$2"
      else
        psql -U "$as_user" -d "$DB_NAME" -c "$*"
      fi
    else
      echo "Neither LOCAL_DB_CONTAINER is set nor psql is installed locally."
      echo "Set LOCAL_DB_CONTAINER to your DB container name, or install psql." >&2
      exit 2
    fi
  fi
}

case "${1:-}" in
  sql)
    shift || { usage; exit 1; }
    if [ -z "${1:-}" ]; then usage; exit 1; fi
    if [ -f "$1" ] && [[ "$1" == *.sql ]]; then
      # execute SQL file
      if [ -n "$DB_CONTAINER" ]; then
        echo "Executing SQL file in container: $DB_CONTAINER"
      else
        echo "Executing SQL file locally with psql"
      fi
      run_psql_in_container "$DB_ADMIN" -f "$1"
    else
      # treat as inline query
      run_psql_in_container "$DB_ADMIN" "$1"
    fi
    ;;
  ai-sql)
    shift || { usage; exit 1; }
    if [ -z "${1:-}" ]; then usage; exit 1; fi
    run_psql_in_container "$AI_USER" "$1"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: ${1:-}" >&2
    usage
    exit 1
    ;;
esac
