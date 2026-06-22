#!/bin/bash
# Execute commands on production server
# Usage:
#   ./scripts/prod-exec.sh sql "SELECT 1;"           — Run SQL query against prod DB (admin)
#   ./scripts/prod-exec.sh sql path/to/file.sql      — Execute .sql file against prod DB
#   ./scripts/prod-exec.sh ai-sql "SELECT 1;"        — Run SQL query as ai_readonly user
#   ./scripts/prod-exec.sh logs [N]                   — Tail last N lines of app logs (default 100)
#   ./scripts/prod-exec.sh redis "GET key"            — Run Redis command
#   ./scripts/prod-exec.sh sh "command"               — Run shell command on prod
#   ./scripts/prod-exec.sh tsx <script> [args...]     — Run TS script inside app container (npx tsx)
#   ./scripts/prod-exec.sh npm "<args>"               — Run npm command inside app container
#   ./scripts/prod-exec.sh seed-validators [args...]  — tsx scripts/seed-system-defaults.ts shortcut
#   ./scripts/prod-exec.sh backup                     — Create DB backup before risky operations
#   ./scripts/prod-exec.sh setup-ai-user              — Create/update ai_readonly DB user on prod

HOST="${PROD_SSH_HOST:-ai-twins-non-root-prod}"
DB_CONTAINER="${PROD_DB_CONTAINER:-ai-twins-db-prod}"
APP_CONTAINER="${PROD_APP_CONTAINER:-ai-twins-app-prod}"
REDIS_CONTAINER="${PROD_REDIS_CONTAINER:-ai-twins-redis}"
DB_NAME="${POSTGRES_DB:-ai_digital_twins}"
DB_ADMIN="${POSTGRES_USER:-admin}"
AI_USER="${AI_READONLY_USER:-ai_readonly}"
APP_WORKDIR="${PROD_APP_WORKDIR:-/app}"

# Shared confirmation gate — used by mutating subcommands (npm, tsx, seed,
# any future write-side path). Set PROD_EXEC_YES=1 to bypass for CI/AI flows.
confirm_or_die() {
  local pretty="$1"
  echo "⚠️  About to execute on PROD ($HOST → $APP_CONTAINER):"
  echo "   $ $pretty"
  if [ "${PROD_EXEC_YES:-}" = "1" ]; then
    echo "(PROD_EXEC_YES=1 — auto-confirmed)"
    return 0
  fi
  read -p "Continue? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
}

case "$1" in
  sql)
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 sql \"SQL_QUERY\""
      echo "       $0 sql path/to/file.sql"
      exit 1
    fi
    # Support .sql file input
    if [ -f "$1" ] && [[ "$1" == *.sql ]]; then
      echo "Executing SQL file: $1"
      ssh "$HOST" "docker exec -i $DB_CONTAINER psql -U $DB_ADMIN -d $DB_NAME" < "$1"
    else
      ssh "$HOST" "docker exec $DB_CONTAINER psql -U $DB_ADMIN -d $DB_NAME -c $(printf '%q' "$1")"
    fi
    ;;
  ai-sql)
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 ai-sql \"SQL_QUERY\""
      exit 1
    fi
    # Run as ai_readonly — can only SELECT
    ssh "$HOST" "docker exec $DB_CONTAINER psql -U $AI_USER -d $DB_NAME -c $(printf '%q' "$1")"
    ;;
  logs)
    LINES="${2:-100}"
    ssh "$HOST" "docker logs --tail $(printf '%q' "$LINES") $APP_CONTAINER"
    ;;
  redis)
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 redis \"COMMAND\""
      exit 1
    fi
    ssh "$HOST" "docker exec $REDIS_CONTAINER redis-cli $(printf '%q' "$1")"
    ;;
  sh)
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 sh \"command\""
      exit 1
    fi
    # Safety: show command and confirm before executing on prod.
    # Set PROD_EXEC_YES=1 to bypass the interactive prompt (use for AI/CI automation).
    echo "⚠️  About to execute on PROD ($HOST):"
    echo "   $ $1"
    if [ "${PROD_EXEC_YES:-}" = "1" ]; then
      echo "(PROD_EXEC_YES=1 — auto-confirmed)"
    else
      read -p "Continue? (y/N) " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
      fi
    fi
    ssh "$HOST" "$1"
    ;;
  pull)
    # Sync prod's git checkout to origin/main. Optionally merge a PR first
    # via the local `gh` CLI, then fetch+pull on prod with safety gates.
    #
    # Usage:
    #   $0 pull              # pull-only (PR already merged elsewhere)
    #   $0 pull <pr-number>  # gh pr merge --squash <pr> + pull
    #
    # NOT triggered: app rebuild/restart. Decoupled on purpose — code on disk
    # ≠ code running. After pull, run `./scripts/deploy.sh` (or click Deploy
    # in the panel) to actually ship the new bits.
    shift
    PR_NUM="${1:-}"

    # Phase 1 — local merge (optional)
    if [ -n "$PR_NUM" ]; then
      if ! command -v gh >/dev/null 2>&1; then
        echo "❌ gh CLI not found. Install it or merge PR #$PR_NUM manually first, then re-run without the PR arg."
        exit 1
      fi
      echo "📦 PR #$PR_NUM:"
      gh pr view "$PR_NUM" --json title,state,mergeable,headRefName \
        -q '"  title: " + .title + "\n  state: " + .state + "\n  branch: " + .headRefName + "\n  mergeable: " + (.mergeable|tostring)' \
        || { echo "❌ gh failed — check auth or PR number"; exit 1; }
      echo ""
      read -p "Merge with --squash --delete-branch? (y/N) " -n 1 -r
      echo ""
      [[ $REPLY =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
      gh pr merge "$PR_NUM" --squash --delete-branch || { echo "❌ merge failed"; exit 1; }
      echo "✅ PR merged."
      echo ""
    fi

    # Phase 2 — fetch on prod
    echo "📥 Fetching origin/main on prod..."
    ssh "$HOST" 'cd ~/ai-digital-twins && git fetch --quiet origin main' \
      || { echo "❌ fetch failed"; exit 1; }

    # Phase 2.5 — branch sanity. If prod is on a feature branch, optionally
    # switch to main, but ONLY if the switch wouldn't lose work (clean tree
    # + no ahead-of-main commits). Common cause: someone deployed a feature
    # branch directly without merging, or did a hotfix on prod.
    BRANCH=$(ssh "$HOST" 'cd ~/ai-digital-twins && git symbolic-ref --short HEAD 2>/dev/null || echo "DETACHED"')
    if [ "$BRANCH" != "main" ]; then
      echo ""
      echo "⚠️  prod is on branch: $BRANCH (expected: main)"
      if [ "$BRANCH" = "DETACHED" ]; then
        echo "❌ Detached HEAD — refusing to touch. Inspect manually:"
        echo "   $0 sh \"cd ~/ai-digital-twins && git status && git log -3 --oneline\""
        exit 1
      fi
      # ahead/behind format from rev-list: "<behind>\t<ahead>" (left=main, right=HEAD)
      COUNTS=$(ssh "$HOST" 'cd ~/ai-digital-twins && git rev-list --left-right --count origin/main...HEAD 2>/dev/null')
      BEHIND=$(echo "$COUNTS" | awk '{print $1}')
      AHEAD=$(echo "$COUNTS" | awk '{print $2}')
      DIRTY=$(ssh "$HOST" 'cd ~/ai-digital-twins && git status --porcelain')
      echo "    vs origin/main: ${AHEAD:-?} ahead, ${BEHIND:-?} behind"
      if [ -n "$DIRTY" ]; then
        echo "    working tree: dirty"
        echo "$DIRTY" | sed 's/^/      /'
      else
        echo "    working tree: clean"
      fi
      echo ""
      # Refuse if any local work would be silently abandoned
      if [ -n "$DIRTY" ]; then
        echo "❌ Refusing to switch — uncommitted changes on $BRANCH would be carried over to main."
        echo "   Inspect: $0 sh \"cd ~/ai-digital-twins && git diff\""
        exit 1
      fi
      if [ "${AHEAD:-0}" -gt 0 ]; then
        echo "❌ Refusing to switch — $BRANCH has $AHEAD commit(s) not in main."
        echo "   These would be orphaned (still in git, but no ref pointing at them)."
        echo "   Push the branch first to preserve them:"
        echo "      $0 sh \"cd ~/ai-digital-twins && git push origin $BRANCH\""
        exit 1
      fi
      read -p "Switch to main? (y/N) " -n 1 -r
      echo ""
      [[ $REPLY =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
      ssh "$HOST" 'cd ~/ai-digital-twins && git checkout main' \
        || { echo "❌ checkout failed"; exit 1; }
      echo "✅ Switched to main."
      echo ""
    fi

    # Phase 2.6 — show what's incoming (now that we're definitely on main)
    INCOMING=$(ssh "$HOST" 'cd ~/ai-digital-twins && git log HEAD..origin/main --oneline')
    if [ -z "$INCOMING" ]; then
      echo "✅ Already up to date — nothing to pull."
      exit 0
    fi
    echo "Incoming commits ($(echo "$INCOMING" | wc -l | tr -d ' ')):"
    echo "$INCOMING" | sed 's/^/  • /'
    echo ""
    echo "Files changed:"
    ssh "$HOST" 'cd ~/ai-digital-twins && git diff --stat HEAD..origin/main' | sed 's/^/  /'
    echo ""

    # Phase 3 — confirm + pull with safety gates (defence-in-depth: branch &
    # clean re-checked on the remote in case state changed between our checks)
    read -p "Pull on prod? (y/N) " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    ssh "$HOST" 'set -e; cd ~/ai-digital-twins && \
      BRANCH=$(git symbolic-ref --short HEAD) && \
      if [ "$BRANCH" != "main" ]; then echo "❌ prod is on $BRANCH, not main — refusing to pull"; exit 1; fi && \
      DIRTY=$(git status --porcelain) && \
      if [ -n "$DIRTY" ]; then echo "❌ working tree dirty:"; echo "$DIRTY" | sed "s/^/  /"; exit 1; fi && \
      git pull --ff-only origin main && \
      echo "" && echo "✅ Now at:" && git log -1 --oneline' \
      || { echo "❌ pull failed (see above)"; exit 1; }
    echo ""
    echo "📦 Code on disk updated. Next: ship it —"
    echo "   ./scripts/deploy.sh           # zero-downtime via script"
    echo "   (or hit Deploy in the panel)"
    ;;
  tsx)
    # Run a TypeScript script inside the app container with `tsx`.
    # Usage: $0 tsx scripts/seed-system-defaults.ts [--id 100]
    #
    # The script path is relative to APP_WORKDIR (default /app). If the same
    # file exists locally and not yet in the prod image (older deploys didn't
    # ship `scripts/`), it's streamed into the container before exec —
    # one-shot, lives until the container restarts.
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 tsx <script-path> [args...]"
      echo "Example: $0 tsx scripts/seed-system-defaults.ts --id 100"
      exit 1
    fi
    SCRIPT="$1"
    shift
    SCRIPT_ARGS=""
    for a in "$@"; do
      SCRIPT_ARGS="$SCRIPT_ARGS $(printf '%q' "$a")"
    done
    confirm_or_die "tsx $SCRIPT$SCRIPT_ARGS"

    # Stage local file → container if missing (works around old images that
    # didn't COPY scripts/). After Dockerfile patch ships, the file is already
    # in-image and this branch is a no-op.
    REMOTE_PATH="$APP_WORKDIR/$SCRIPT"
    if [ -f "$SCRIPT" ]; then
      EXISTS=$(ssh "$HOST" "docker exec $APP_CONTAINER sh -c 'test -f $(printf '%q' "$REMOTE_PATH") && echo yes || echo no'")
      if [ "$EXISTS" = "no" ]; then
        echo "📤 Staging local $SCRIPT → container:$REMOTE_PATH"
        # mkdir -p in container, then stream file. `cat >` runs as the
        # container user (nodejs) so /app must be writable by them — it is
        # (chown'd in Dockerfile).
        REMOTE_DIR=$(dirname "$REMOTE_PATH")
        ssh "$HOST" "docker exec -i $APP_CONTAINER sh -c 'mkdir -p $(printf '%q' "$REMOTE_DIR") && cat > $(printf '%q' "$REMOTE_PATH")'" < "$SCRIPT" \
          || { echo "❌ stage failed"; exit 1; }
      fi
    fi
    ssh -t "$HOST" "docker exec -i $APP_CONTAINER sh -c 'cd $APP_WORKDIR && npx tsx $(printf '%q' "$SCRIPT")$SCRIPT_ARGS'"
    ;;
  npm)
    # Run an npm command inside the app container.
    # Usage: $0 npm "run validate"
    #        $0 npm "run db:status"
    #        $0 npm "ls --depth=0"
    #
    # NB: install/update-style commands are NOT meant for prod (the image is
    # built immutably by deploy.sh). This wrapper is for diagnostic + script
    # runners (`npm run …`).
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 npm \"<npm command>\""
      echo "Example: $0 npm \"run db:status\""
      echo ""
      echo "⚠️  install/update commands rebuild deps on a running container — "
      echo "    use ./scripts/deploy.sh to ship dep changes instead."
      exit 1
    fi
    case "$1" in
      install*|i\ *|i|update*|upd\ *|ci|add\ *|remove\ *|uninstall\ *)
        echo "❌ Refusing '$1' on a running prod container."
        echo "   Dependency changes ship via ./scripts/deploy.sh (image rebuild)."
        echo "   Set PROD_EXEC_FORCE_NPM_WRITE=1 if you really mean it."
        if [ "${PROD_EXEC_FORCE_NPM_WRITE:-}" != "1" ]; then
          exit 1
        fi
        ;;
    esac
    confirm_or_die "npm $1"
    ssh -t "$HOST" "docker exec -i $APP_CONTAINER sh -c 'cd $APP_WORKDIR && npm $(printf '%q' "$1")'"
    ;;
  seed-validators)
    # Convenience shortcut for the F136/spec-141 validator seed runner.
    # Idempotent — only inserts missing rows + updates non-customised fields.
    # Routes through the `tsx` subcommand so script staging works the same.
    shift
    exec "$0" tsx scripts/seed-system-defaults.ts "$@"
    ;;
  backup)
    echo "📦 Creating prod backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    ssh "$HOST" "mkdir -p ~/ai-digital-twins/backups && docker exec $DB_CONTAINER pg_dump -U $DB_ADMIN -Fc $DB_NAME > ~/ai-digital-twins/backups/pre_ai_${TIMESTAMP}.dump && echo '✅ Backup: ~/ai-digital-twins/backups/pre_ai_${TIMESTAMP}.dump' && du -h ~/ai-digital-twins/backups/pre_ai_${TIMESTAMP}.dump"
    ;;
  langfuse)
    shift
    if [ -z "$1" ]; then
      echo "Usage: $0 langfuse <init|up|check|logs|restart|down>"
      echo ""
      echo "Runs ./scripts/deploy-langfuse.sh on prod over an interactive SSH"
      echo "session (ssh -t). Use this for ALL Langfuse stack operations on prod."
      echo ""
      echo "First-time setup tip: pre-fill init prompts via env vars to skip TTY:"
      echo "  $0 sh \"cd ~/ai-digital-twins && \\"
      echo "    LF_NEXTAUTH_URL=https://langfuse.aitwin.site \\"
      echo "    LF_INIT_USER_EMAIL=admin@aitwin.site \\"
      echo "    ./scripts/deploy-langfuse.sh init\""
      exit 1
    fi
    # ssh -t allocates a TTY so `read` prompts in the deploy script work.
    # Quoting the args preserves spaces in the rare case of compound options.
    ARGS=""
    for a in "$@"; do
      ARGS="$ARGS $(printf '%q' "$a")"
    done
    ssh -t "$HOST" "cd ~/ai-digital-twins && ./scripts/deploy-langfuse.sh$ARGS"
    ;;
  setup-ai-user)
    echo "🔒 Creating ai_readonly user on prod..."
    echo ""
    echo "Enter password for ai_readonly user (or press Enter to auto-generate):"
    read -r AI_PASS
    if [ -z "$AI_PASS" ]; then
      AI_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
      echo "   Generated password: $AI_PASS"
    fi
    echo ""

    ssh "$HOST" "docker exec $DB_CONTAINER psql -U $DB_ADMIN -d $DB_NAME" <<EOSQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$AI_USER') THEN
        CREATE ROLE "$AI_USER" WITH LOGIN PASSWORD '$AI_PASS';
    ELSE
        ALTER ROLE "$AI_USER" WITH PASSWORD '$AI_PASS';
    END IF;
END
\$\$;

GRANT CONNECT ON DATABASE "$DB_NAME" TO "$AI_USER";
GRANT USAGE ON SCHEMA public TO "$AI_USER";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO "$AI_USER";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "$AI_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "$AI_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO "$AI_USER";
REVOKE CREATE ON SCHEMA public FROM "$AI_USER";
EOSQL

    echo ""
    echo "✅ User '$AI_USER' created on prod."
    echo ""
    echo "📋 Save these credentials:"
    echo "   User:     $AI_USER"
    echo "   Password: $AI_PASS"
    echo "   Database: $DB_NAME"
    echo ""
    echo "🔧 For prod-exec.sh:  ./scripts/prod-exec.sh ai-sql \"SELECT count(*) FROM users;\""
    echo ""
    echo "⚠️  Don't forget to add AI_READONLY_PASSWORD to .env.production on the server!"
    ;;
  *)
    echo "Production execution tool"
    echo ""
    echo "Usage:"
    echo "  $0 sql \"SELECT 1;\"            Run SQL on prod DB (admin)"
    echo "  $0 ai-sql \"SELECT 1;\"         Run SQL on prod DB (ai_readonly, safe)"
    echo "  $0 logs [N]                    Tail app logs (default 100)"
    echo "  $0 redis \"GET key\"             Run Redis command"
    echo "  $0 sh \"command\"                Run shell command on prod"
    echo "  $0 tsx <script> [args]         Run TS script inside app container (npx tsx <script>)"
    echo "  $0 npm \"<args>\"                Run npm command inside app container"
    echo "  $0 seed-validators [args]      Shortcut for tsx scripts/seed-system-defaults.ts"
    echo "  $0 pull [<pr>]                 Sync prod git to origin/main (optionally merge PR first)"
    echo "  $0 backup                      Create DB backup"
    echo "  $0 setup-ai-user              Create ai_readonly DB user"
    echo "  $0 langfuse <subcmd>           Manage Langfuse stack on prod (init/up/check/logs/restart/down)"
    exit 1
    ;;
esac
